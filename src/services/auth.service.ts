import { getUserID, getUserInfo, getAccessToken } from "zmp-sdk";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/config/firebase";
import type { UserDoc, UserRole } from "@/types";

export async function getZaloUser(): Promise<{ id: string; name: string; avatar: string }> {
  const { userInfo } = await getUserInfo({});
  const id = userInfo.id || (await getUserID({})).toString();
  return {
    id,
    name: userInfo.name || "Zalo User",
    avatar: userInfo.avatar || "",
  };
}

export async function getZaloAccessToken(): Promise<string> {
  const result = await getAccessToken({});
  return result as unknown as string;
}

export async function getUserDoc(userId: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as UserDoc;
}

export async function createOrUpdateUser(
  zaloId: string,
  name: string,
  avatar: string,
  role?: UserRole
): Promise<UserDoc> {
  const ref = doc(db, "users", zaloId);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    const data = existing.data() as Omit<UserDoc, "id">;
    await setDoc(ref, { ...data, name, avatar, updatedAt: Date.now() }, { merge: true });
    return { id: zaloId, ...data, name, avatar, updatedAt: Date.now() };
  }

  const newUser: Omit<UserDoc, "id"> = {
    zaloId,
    name,
    avatar,
    role: role || "student",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await setDoc(ref, newUser);
  return { id: zaloId, ...newUser };
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  await setDoc(doc(db, "users", userId), { role, updatedAt: Date.now() }, { merge: true });
}
