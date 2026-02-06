import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import type { UserDoc, UserRole } from "@/types";

const googleProvider = new GoogleAuthProvider();

// --- Timeout helper: prevents hanging when Firestore is blocked ---
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

// --- Auth actions ---

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
  localStorage.removeItem("user_doc");
}

export function listenAuthState(
  callback: (user: User | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, callback);
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
  role?: UserRole,
  email?: string
): Promise<UserDoc> {
  try {
    const ref = doc(db, "users", uid);
    const existing = await withTimeout(getDoc(ref), 5000);

    if (existing.exists()) {
      const data = existing.data() as Omit<UserDoc, "id">;
      const updates: Record<string, any> = { name, avatar, updatedAt: Date.now() };
      if (email) updates.email = email;
      await withTimeout(setDoc(ref, updates, { merge: true }), 5000);
      const merged = { id: uid, ...data, ...updates } as UserDoc;
      localStorage.setItem("user_doc", JSON.stringify(merged));
      return merged;
    }

    const userDoc: Omit<UserDoc, "id"> = {
      email,
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
    // Firestore blocked/unavailable — use localStorage
    return _createLocalUser(uid, name, avatar, role, email);
  }
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  try {
    await withTimeout(
      setDoc(doc(db, "users", userId), { role, updatedAt: Date.now() }, { merge: true }),
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
      parsed.updatedAt = Date.now();
      localStorage.setItem("user_doc", JSON.stringify(parsed));
    }
  }
}

// --- Load or build UserDoc from Firebase User ---

export async function loadOrCreateUserDoc(firebaseUser: User): Promise<UserDoc> {
  const existing = await getUserDoc(firebaseUser.uid);
  if (existing) return existing;

  return await createOrUpdateUser(
    firebaseUser.uid,
    firebaseUser.displayName || "Google User",
    firebaseUser.photoURL || "",
    undefined,
    firebaseUser.email || undefined
  );
}

// --- localStorage helpers ---

function _getLocalUserDoc(userId: string): UserDoc | null {
  const stored = localStorage.getItem("user_doc");
  if (!stored) return null;
  const parsed = JSON.parse(stored) as UserDoc;
  return parsed.id === userId ? parsed : null;
}

function _createLocalUser(
  uid: string,
  name: string,
  avatar: string,
  role?: UserRole,
  email?: string
): UserDoc {
  const stored = localStorage.getItem("user_doc");
  if (stored) {
    const parsed = JSON.parse(stored) as UserDoc;
    if (parsed.id === uid) {
      const updated = { ...parsed, name, avatar, updatedAt: Date.now() };
      if (role) updated.role = role;
      if (email) updated.email = email;
      localStorage.setItem("user_doc", JSON.stringify(updated));
      return updated;
    }
  }
  const newUser: UserDoc = {
    id: uid,
    email,
    name,
    avatar,
    role: role || ("" as any),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  localStorage.setItem("user_doc", JSON.stringify(newUser));
  return newUser;
}
