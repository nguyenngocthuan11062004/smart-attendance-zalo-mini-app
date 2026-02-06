import { getUserID, getUserInfo, getAccessToken } from "zmp-sdk";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import type { UserDoc, UserRole } from "@/types";

// Dev mode fallback when running outside Zalo
const DEV_MODE = !window.location.href.includes("zalo");

function generateDevId(): string {
  let id = localStorage.getItem("dev_user_id");
  if (!id) {
    id = "dev_" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("dev_user_id", id);
  }
  return id;
}

export async function getZaloUser(): Promise<{ id: string; name: string; avatar: string }> {
  if (DEV_MODE) {
    const id = generateDevId();
    return { id, name: "Dev User", avatar: "" };
  }
  try {
    const { userInfo } = await getUserInfo({});
    const id = userInfo.id || (await getUserID({})).toString();
    return {
      id,
      name: userInfo.name || "Zalo User",
      avatar: userInfo.avatar || "",
    };
  } catch {
    const id = generateDevId();
    return { id, name: "Zalo User", avatar: "" };
  }
}

export async function getZaloAccessToken(): Promise<string> {
  if (DEV_MODE) return "dev_token";
  try {
    const result = await getAccessToken({});
    return result as unknown as string;
  } catch {
    return "";
  }
}

export async function getUserDoc(userId: string): Promise<UserDoc | null> {
  try {
    const snap = await getDoc(doc(db, "users", userId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as UserDoc;
  } catch {
    // Firestore not configured - return from localStorage
    const stored = localStorage.getItem("user_doc");
    if (stored) {
      const parsed = JSON.parse(stored) as UserDoc;
      if (parsed.id === userId) return parsed;
    }
    return null;
  }
}

export async function createOrUpdateUser(
  zaloId: string,
  name: string,
  avatar: string,
  role?: UserRole
): Promise<UserDoc> {
  const newUser: UserDoc = {
    id: zaloId,
    zaloId,
    name,
    avatar,
    role: role || ("" as any),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  try {
    const ref = doc(db, "users", zaloId);
    const existing = await getDoc(ref);

    if (existing.exists()) {
      const data = existing.data() as Omit<UserDoc, "id">;
      await setDoc(ref, { ...data, name, avatar, updatedAt: Date.now() }, { merge: true });
      const merged = { id: zaloId, ...data, name, avatar, updatedAt: Date.now() } as UserDoc;
      localStorage.setItem("user_doc", JSON.stringify(merged));
      return merged;
    }

    const userDoc: Omit<UserDoc, "id"> = {
      zaloId,
      name,
      avatar,
      role: role || ("" as any),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await setDoc(ref, userDoc);
    const result = { id: zaloId, ...userDoc };
    localStorage.setItem("user_doc", JSON.stringify(result));
    return result;
  } catch {
    // Firestore unavailable - use localStorage
    const stored = localStorage.getItem("user_doc");
    if (stored) {
      const parsed = JSON.parse(stored) as UserDoc;
      if (parsed.id === zaloId) {
        const updated = { ...parsed, name, avatar, updatedAt: Date.now() };
        if (role) updated.role = role;
        localStorage.setItem("user_doc", JSON.stringify(updated));
        return updated;
      }
    }
    localStorage.setItem("user_doc", JSON.stringify(newUser));
    return newUser;
  }
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  try {
    await setDoc(doc(db, "users", userId), { role, updatedAt: Date.now() }, { merge: true });
  } catch {
    // Firestore unavailable - update localStorage
  }
  const stored = localStorage.getItem("user_doc");
  if (stored) {
    const parsed = JSON.parse(stored) as UserDoc;
    if (parsed.id === userId) {
      parsed.role = role;
      parsed.updatedAt = Date.now();
      localStorage.setItem("user_doc", JSON.stringify(parsed));
    }
  }
}
