import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { generateNonce } from "@/utils/crypto";
import { isMockMode, mockDb } from "@/utils/mock-db";
import type { SessionDoc, GeoLocation } from "@/types";

const SESSIONS = "sessions";

export async function startSession(
  classId: string,
  className: string,
  teacherId: string
): Promise<SessionDoc> {
  const data: Omit<SessionDoc, "id"> = {
    classId,
    className,
    teacherId,
    status: "active",
    hmacSecret: generateNonce() + generateNonce(),
    qrRefreshInterval: 30,
    startedAt: Date.now(),
  };
  if (isMockMode()) {
    return mockDb.createSession(data);
  }
  const ref = doc(collection(db, SESSIONS));
  // Write session WITHOUT hmacSecret (secret stored in subcollection)
  const { hmacSecret: secret, ...sessionData } = data;
  await setDoc(ref, sessionData);
  // Write hmacSecret to subcollection (only readable by teacher via rules)
  await setDoc(doc(db, SESSIONS, ref.id, "secrets", "hmac"), { hmacSecret: secret });
  return { id: ref.id, ...data };
}

/**
 * Read the HMAC secret for a session (teacher-only via Firestore rules).
 * Used for QR code generation on the teacher side.
 */
export async function getSessionSecret(sessionId: string): Promise<string | null> {
  if (isMockMode()) {
    const s = mockDb.getSession(sessionId);
    return s?.hmacSecret || null;
  }
  const snap = await getDoc(doc(db, SESSIONS, sessionId, "secrets", "hmac"));
  if (!snap.exists()) return null;
  return snap.data().hmacSecret;
}

export async function endSession(sessionId: string): Promise<void> {
  if (isMockMode()) { mockDb.endSession(sessionId); return; }
  await updateDoc(doc(db, SESSIONS, sessionId), {
    status: "ended",
    endedAt: Date.now(),
  });
}

export async function getSession(sessionId: string): Promise<SessionDoc | null> {
  if (isMockMode()) return mockDb.getSession(sessionId);
  const snap = await getDoc(doc(db, SESSIONS, sessionId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as SessionDoc;
}

export async function getActiveSessionForClass(classId: string): Promise<SessionDoc | null> {
  if (isMockMode()) return mockDb.getActiveSessionForClass(classId);
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
  if (isMockMode()) {
    // Mock: call once with current data
    callback(mockDb.getSession(sessionId));
    return () => {};
  }
  return onSnapshot(doc(db, SESSIONS, sessionId), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback({ id: snap.id, ...snap.data() } as SessionDoc);
  });
}

export async function updateSessionLocation(
  sessionId: string,
  location: GeoLocation,
  geoFenceRadius: number = 200
): Promise<void> {
  if (isMockMode()) {
    const s = mockDb.getSession(sessionId);
    if (s) {
      (s as any).location = location;
      (s as any).geoFenceRadius = geoFenceRadius;
    }
    return;
  }
  await updateDoc(doc(db, SESSIONS, sessionId), { location, geoFenceRadius });
}

export async function getClassSessions(classId: string): Promise<SessionDoc[]> {
  if (isMockMode()) return mockDb.getClassSessions(classId);
  const q = query(
    collection(db, SESSIONS),
    where("classId", "==", classId),
    orderBy("startedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SessionDoc);
}
