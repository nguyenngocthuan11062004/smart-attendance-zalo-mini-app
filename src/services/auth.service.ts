import { getUserID, getUserInfo, getAccessToken as zmpGetAccessToken, authorize, getPhoneNumber } from "zmp-sdk/apis";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/config/firebase";
import type { UserDoc, UserRole } from "@/types";
import { storageSetItem, storageGetItem, storageRemoveItem } from "@/utils/storage";

/**
 * Get Zalo access token for Cloud Function authentication.
 * Returns empty string in dev mode or if token retrieval fails.
 */
export async function getAccessToken(): Promise<string> {
  try {
    const token = await zmpGetAccessToken({});
    return token || "";
  } catch {
    return "";
  }
}

// --- Timeout helper ---

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

// --- Auto sign-in with Zalo ---

/**
 * Auto sign-in using Zalo SDK.
 * Gets Zalo user info (id, name, avatar) and creates/updates user doc.
 */
/**
 * Auto sign-in — chỉ lấy getUserID(), KHÔNG xin quyền.
 * Theo chính sách Zalo 6.1: không được xin quyền khi user vừa vào app.
 */
export async function signIn(): Promise<UserDoc> {
  let uid: string;
  const name = "Zalo User";
  const avatar = "";

  try {
    uid = (await getUserID({})).toString();
  } catch {
    uid = _getOrCreateLocalId();
  }

  return await createOrUpdateUser(uid, name, avatar);
}

/**
 * Xin quyền userInfo và cập nhật thông tin (tên, avatar).
 * Gọi khi user tương tác (VD: nhấn "Tiếp tục" ở login) — có ngữ cảnh rõ ràng.
 * Theo chính sách Zalo 6.1 + 6.3: user từ chối vẫn dùng được app.
 */
export async function requestUserInfo(userId: string): Promise<{ name: string; avatar: string } | null> {
  try {
    await authorize({ scopes: ["scope.userInfo"] });
    const { userInfo } = await getUserInfo({ autoRequestPermission: false });
    const name = userInfo.name || "Zalo User";
    const avatar = userInfo.avatar || "";

    // Cập nhật Firestore + storage
    await withTimeout(
      setDoc(doc(db, "users", userId), { name, avatar, updatedAt: Date.now() }, { merge: true }),
      5000
    );
    const stored = await storageGetItem("user_doc");
    if (stored) {
      const parsed = JSON.parse(stored) as UserDoc;
      parsed.name = name;
      parsed.avatar = avatar;
      parsed.updatedAt = Date.now();
      await storageSetItem("user_doc", JSON.stringify(parsed));
    }

    return { name, avatar };
  } catch {
    // User từ chối — vẫn dùng được app với tên mặc định
    return null;
  }
}

// --- Request phone number (separate permission) ---

/**
 * Request phone number permission and retrieve phone.
 * Called on-demand (e.g., profile page) — NOT during sign-in.
 * Returns phone string or null if user denies / error.
 */
export async function requestPhoneNumber(): Promise<string | null> {
  try {
    await authorize({ scopes: ["scope.userPhonenumber"] });
  } catch {
    return null;
  }

  try {
    const phoneResult = await getPhoneNumber({});
    if (phoneResult.number) {
      return phoneResult.number;
    }
    if (phoneResult.token) {
      try {
        const accessToken = await zmpGetAccessToken({});
        const resolve = httpsCallable<
          { token: string; accessToken: string },
          { phone: string }
        >(functions, "resolveZaloPhoneToken");
        const { data } = await resolve({
          token: phoneResult.token,
          accessToken: accessToken || "",
        });
        if (data.phone) return data.phone;
      } catch {
        // Cloud Function chưa deploy hoặc token hết hạn
      }
    }
  } catch {
    // Không lấy được SĐT
  }

  return null;
}

// --- Sign out ---

let _loggedOut = false;
export function isLoggedOut(): boolean { return _loggedOut; }
export function clearLoggedOut(): void { _loggedOut = false; }

export async function signOutUser(userId?: string): Promise<void> {
  _loggedOut = true;
  // Reset role + MSSV trên Firestore → lần đăng nhập sau phải chọn lại
  if (userId) {
    try {
      await withTimeout(
        setDoc(doc(db, "users", userId), { role: "", mssv: "", updatedAt: Date.now() }, { merge: true }),
        3000
      );
    } catch { /* ignore */ }
    // Xóa verified_students → phải verify email lại
    try {
      const { deleteDoc: delDoc } = await import("firebase/firestore");
      await delDoc(doc(db, "verified_students", userId));
    } catch { /* ignore */ }
  }
  await storageRemoveItem("user_doc");
  // Xóa cache
  try {
    const { cacheClearAll } = await import("@/utils/cache");
    await cacheClearAll();
  } catch { /* ignore */ }
}

// --- Auth state initialization ---

/**
 * Restores session on app load.
 * 1. Try Zalo SDK storage first (async)
 * 2. If nothing stored, auto sign-in with Zalo SDK
 */
export function initAuthState(
  callback: (userDoc: UserDoc | null, initialized: boolean) => void
): () => void {
  let cancelled = false;

  // Nếu vừa logout → không auto sign-in, chờ user mở lại app
  if (_loggedOut) {
    callback(null, true);
    return () => { cancelled = true; };
  }

  // 1. Restore from Zalo SDK storage (async)
  storageGetItem("user_doc")
    .then((stored) => {
      if (cancelled) return;
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as UserDoc;
          callback(parsed, true);
          return;
        } catch {
          // corrupted, continue to sign-in
        }
      }

      // 2. Auto sign-in with Zalo (chỉ lấy getUserID, không popup)
      signIn()
        .then((userDoc) => { if (!cancelled) callback(userDoc, true); })
        .catch(() => { if (!cancelled) callback(null, true); });
    })
    .catch(() => {
      // Storage read failed -- fall back to sign-in
      if (cancelled) return;
      signIn()
        .then((userDoc) => { if (!cancelled) callback(userDoc, true); })
        .catch(() => { if (!cancelled) callback(null, true); });
    });

  return () => { cancelled = true; };
}

// --- Firestore user doc ---

export async function getUserDoc(userId: string): Promise<UserDoc | null> {
  try {
    const snap = await withTimeout(getDoc(doc(db, "users", userId)), 5000);
    if (!snap.exists()) return null;
    const userDoc = { id: snap.id, ...snap.data() } as UserDoc;
    await storageSetItem("user_doc", JSON.stringify(userDoc));
    return userDoc;
  } catch {
    return await _getLocalUserDoc(userId);
  }
}

export async function createOrUpdateUser(
  uid: string,
  name: string,
  avatar: string,
  role?: UserRole,
  followedOA?: boolean,
  phone?: string
): Promise<UserDoc> {
  try {
    const ref = doc(db, "users", uid);
    const existing = await withTimeout(getDoc(ref), 5000);

    if (existing.exists()) {
      const data = existing.data() as Omit<UserDoc, "id">;
      const updates: Record<string, any> = { name, avatar, updatedAt: Date.now() };
      if (followedOA !== undefined) updates.followedOA = followedOA;
      if (phone) { updates.phone = phone; updates.zaloPhone = phone; }
      await withTimeout(setDoc(ref, updates, { merge: true }), 5000);
      const merged = { id: uid, ...data, ...updates } as UserDoc;
      await storageSetItem("user_doc", JSON.stringify(merged));
      return merged;
    }

    // Only allow empty or student role on client-side creation
    const safeRole = (role === "student") ? "student" : "";
    const userDoc: Record<string, any> = {
      name,
      avatar,
      role: safeRole,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (followedOA !== undefined) userDoc.followedOA = followedOA;
    if (phone) { userDoc.phone = phone; userDoc.zaloPhone = phone; }
    await withTimeout(setDoc(ref, userDoc), 5000);
    const result = { id: uid, ...userDoc } as UserDoc;
    await storageSetItem("user_doc", JSON.stringify(result));
    return result;
  } catch {
    return await _createLocalUser(uid, name, avatar, role);
  }
}

export async function updateUserRole(userId: string, role: UserRole, mssv?: string): Promise<void> {
  // Client can only self-assign "student" role. Teacher role requires Cloud Function (assignTeacherRole).
  if (role === "teacher") {
    throw new Error("Teacher role must be assigned via server. Use requestTeacherRole() instead.");
  }

  const updates: Record<string, any> = { role, updatedAt: Date.now() };
  if (mssv) updates.mssv = mssv;

  await withTimeout(
    setDoc(doc(db, "users", userId), updates, { merge: true }),
    5000
  );

  const stored = await storageGetItem("user_doc");
  if (stored) {
    const parsed = JSON.parse(stored) as UserDoc;
    if (parsed.id === userId) {
      parsed.role = role;
      if (mssv) parsed.mssv = mssv;
      parsed.updatedAt = Date.now();
      await storageSetItem("user_doc", JSON.stringify(parsed));
    }
  }
}

/**
 * Assign teacher role — writes directly to Firestore (open rules).
 * TODO: Khi có Blaze plan, chuyển lại dùng Cloud Function assignTeacherRole
 * để validate server-side.
 */
export async function requestTeacherRole(userId: string): Promise<void> {
  await withTimeout(
    setDoc(doc(db, "users", userId), { role: "teacher", updatedAt: Date.now() }, { merge: true }),
    5000
  );

  const stored = await storageGetItem("user_doc");
  if (stored) {
    const parsed = JSON.parse(stored) as UserDoc;
    if (parsed.id === userId) {
      parsed.role = "teacher";
      parsed.updatedAt = Date.now();
      await storageSetItem("user_doc", JSON.stringify(parsed));
    }
  }
}

export async function markFaceRegistered(userId: string): Promise<void> {
  try {
    await withTimeout(
      setDoc(doc(db, "users", userId), { faceRegistered: true, updatedAt: Date.now() }, { merge: true }),
      5000
    );
  } catch {
    // Firestore unavailable
  }
  const stored = await storageGetItem("user_doc");
  if (stored) {
    const parsed = JSON.parse(stored) as UserDoc;
    if (parsed.id === userId) {
      parsed.faceRegistered = true;
      parsed.updatedAt = Date.now();
      await storageSetItem("user_doc", JSON.stringify(parsed));
    }
  }
}

// --- Storage helpers ---

async function _getLocalUserDoc(userId: string): Promise<UserDoc | null> {
  const stored = await storageGetItem("user_doc");
  if (!stored) return null;
  const parsed = JSON.parse(stored) as UserDoc;
  return parsed.id === userId ? parsed : null;
}

async function _createLocalUser(uid: string, name: string, avatar: string, role?: UserRole): Promise<UserDoc> {
  // Never allow teacher role in local fallback — teacher must come from server
  const safeRole = (role === "student") ? "student" : ("" as any);
  const stored = await storageGetItem("user_doc");
  if (stored) {
    const parsed = JSON.parse(stored) as UserDoc;
    if (parsed.id === uid) {
      const updated = { ...parsed, name, avatar, updatedAt: Date.now() };
      if (safeRole) updated.role = safeRole;
      await storageSetItem("user_doc", JSON.stringify(updated));
      return updated;
    }
  }
  const newUser: UserDoc = {
    id: uid,
    name,
    avatar,
    role: safeRole,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await storageSetItem("user_doc", JSON.stringify(newUser));
  return newUser;
}

function _getOrCreateLocalId(): string {
  // Dev-only fallback: use sync localStorage directly since this is only
  // called when Zalo SDK is unavailable (browser dev mode)
  let id = localStorage.getItem("dev_user_id");
  if (!id) {
    id = "local_" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("dev_user_id", id);
  }
  return id;
}
