import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { generateNonce } from "@/utils/crypto";
import type { SessionDoc } from "@/types";

const SESSIONS = "sessions";

export async function startSession(
  classId: string,
  className: string,
  teacherId: string
): Promise<SessionDoc> {
  const ref = doc(collection(db, SESSIONS));
  const session: Omit<SessionDoc, "id"> = {
    classId,
    className,
    teacherId,
    status: "active",
    hmacSecret: generateNonce() + generateNonce(),
    qrRefreshInterval: 15,
    startedAt: Date.now(),
  };
  await setDoc(ref, session);
  return { id: ref.id, ...session };
}

export async function endSession(sessionId: string): Promise<void> {
  await updateDoc(doc(db, SESSIONS, sessionId), {
    status: "ended",
    endedAt: Date.now(),
  });
}

export async function getSession(sessionId: string): Promise<SessionDoc | null> {
  const snap = await getDoc(doc(db, SESSIONS, sessionId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as SessionDoc;
}

export async function getActiveSessionForClass(classId: string): Promise<SessionDoc | null> {
  const q = query(
    collection(db, SESSIONS),
    where("classId", "==", classId),
    where("status", "==", "active")
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as SessionDoc;
}

export function subscribeToSession(
  sessionId: string,
  callback: (session: SessionDoc | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, SESSIONS, sessionId), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback({ id: snap.id, ...snap.data() } as SessionDoc);
  });
}
