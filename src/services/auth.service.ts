import { getUserID, getUserInfo } from "zmp-sdk";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import type { UserDoc, UserRole } from "@/types";

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
export async function signIn(): Promise<UserDoc> {
  let uid: string;
  let name = "Zalo User";
  let avatar = "";

  try {
    const { userInfo } = await getUserInfo({});
    uid = userInfo.id || (await getUserID({})).toString();
    name = userInfo.name || name;
    avatar = userInfo.avatar || avatar;
  } catch {
    try {
      uid = (await getUserID({})).toString();
    } catch {
      uid = _getOrCreateLocalId();
    }
  }

  return await createOrUpdateUser(uid, name, avatar);
}

// --- Sign out ---

export async function signOutUser(): Promise<void> {
  localStorage.removeItem("user_doc");
}

// --- Auth state initialization ---

/**
 * Restores session on app load.
 * 1. Try localStorage first (instant)
 * 2. If nothing stored, auto sign-in with Zalo SDK
 */
export function initAuthState(
  callback: (userDoc: UserDoc | null, initialized: boolean) => void
): () => void {
  // 1. Restore from localStorage
  const stored = localStorage.getItem("user_doc");
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as UserDoc;
      callback(parsed, true);
      return () => {};
    } catch {
      // corrupted, continue
    }
  }

  // 2. Auto sign-in with Zalo
  signIn()
    .then((userDoc) => callback(userDoc, true))
    .catch(() => callback(null, true));

  return () => {};
}

// --- Firestore user doc ---

export async function getUserDoc(userId: string): Promise<UserDoc | null> {
  try {
    const snap = await withTimeout(getDoc(doc(db, "users", userId)), 5000);
    if (!snap.exists()) return null;
    const userDoc = { id: snap.id, ...snap.data() } as UserDoc;
    localStorage.setItem("user_doc", JSON.stringify(userDoc));
    return userDoc;
  } catch {
    return _getLocalUserDoc(userId);
  }
}

export async function createOrUpdateUser(
  uid: string,
  name: string,
  avatar: string,
  role?: UserRole
): Promise<UserDoc> {
  try {
    const ref = doc(db, "users", uid);
    const existing = await withTimeout(getDoc(ref), 5000);

    if (existing.exists()) {
      const data = existing.data() as Omit<UserDoc, "id">;
      const updates = { name, avatar, updatedAt: Date.now() };
      await withTimeout(setDoc(ref, updates, { merge: true }), 5000);
      const merged = { id: uid, ...data, ...updates } as UserDoc;
      localStorage.setItem("user_doc", JSON.stringify(merged));
      return merged;
    }

    const userDoc = {
      name,
      avatar,
      role: role || ("" as any),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await withTimeout(setDoc(ref, userDoc), 5000);
    const result = { id: uid, ...userDoc } as UserDoc;
    localStorage.setItem("user_doc", JSON.stringify(result));
    return result;
  } catch {
    return _createLocalUser(uid, name, avatar, role);
  }
}

export async function updateUserRole(userId: string, role: UserRole, mssv?: string): Promise<void> {
  const updates: Record<string, any> = { role, updatedAt: Date.now() };
  if (mssv) updates.mssv = mssv;

  try {
    await withTimeout(
      setDoc(doc(db, "users", userId), updates, { merge: true }),
      5000
    );
  } catch {
    // Firestore unavailable
  }
  const stored = localStorage.getItem("user_doc");
  if (stored) {
    const parsed = JSON.parse(stored) as UserDoc;
    if (parsed.id === userId) {
      parsed.role = role;
      if (mssv) parsed.mssv = mssv;
      parsed.updatedAt = Date.now();
      localStorage.setItem("user_doc", JSON.stringify(parsed));
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
  const stored = localStorage.getItem("user_doc");
  if (stored) {
    const parsed = JSON.parse(stored) as UserDoc;
    if (parsed.id === userId) {
      parsed.faceRegistered = true;
      parsed.updatedAt = Date.now();
      localStorage.setItem("user_doc", JSON.stringify(parsed));
    }
  }
}

// --- localStorage helpers ---

function _getLocalUserDoc(userId: string): UserDoc | null {
  const stored = localStorage.getItem("user_doc");
  if (!stored) return null;
  const parsed = JSON.parse(stored) as UserDoc;
  return parsed.id === userId ? parsed : null;
}

function _createLocalUser(uid: string, name: string, avatar: string, role?: UserRole): UserDoc {
  const stored = localStorage.getItem("user_doc");
  if (stored) {
    const parsed = JSON.parse(stored) as UserDoc;
    if (parsed.id === uid) {
      const updated = { ...parsed, name, avatar, updatedAt: Date.now() };
      if (role) updated.role = role;
      localStorage.setItem("user_doc", JSON.stringify(updated));
      return updated;
    }
  }
  const newUser: UserDoc = {
    id: uid,
    name,
    avatar,
    role: role || ("" as any),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  localStorage.setItem("user_doc", JSON.stringify(newUser));
  return newUser;
}

function _getOrCreateLocalId(): string {
  let id = localStorage.getItem("dev_user_id");
  if (!id) {
    id = "local_" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("dev_user_id", id);
  }
  return id;
}
