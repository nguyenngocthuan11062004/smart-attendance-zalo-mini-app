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
  arrayUnion,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { computeTrustScore } from "@/types";
import type { AttendanceDoc, PeerVerification, TrustScore } from "@/types";

const ATTENDANCE = "attendance";

export async function checkInStudent(
  sessionId: string,
  classId: string,
  studentId: string,
  studentName: string
): Promise<AttendanceDoc> {
  const q = query(
    collection(db, ATTENDANCE),
    where("sessionId", "==", sessionId),
    where("studentId", "==", studentId)
  );
  const existing = await getDocs(q);
  if (!existing.empty) {
    const d = existing.docs[0];
    return { id: d.id, ...d.data() } as AttendanceDoc;
  }

  const ref = doc(collection(db, ATTENDANCE));
  const record: Omit<AttendanceDoc, "id"> = {
    sessionId,
    classId,
    studentId,
    studentName,
    checkedInAt: Date.now(),
    peerVerifications: [],
    peerCount: 0,
    trustScore: "absent",
  };
  await setDoc(ref, record);
  return { id: ref.id, ...record };
}

export async function addPeerVerification(
  attendanceId: string,
  peer: PeerVerification
): Promise<void> {
  const ref = doc(db, ATTENDANCE, attendanceId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data() as Omit<AttendanceDoc, "id">;
  const newCount = data.peerCount + 1;

  await updateDoc(ref, {
    peerVerifications: arrayUnion(peer),
    peerCount: newCount,
    trustScore: computeTrustScore(newCount),
  });
}

export async function getMyAttendance(
  sessionId: string,
  studentId: string
): Promise<AttendanceDoc | null> {
  const q = query(
    collection(db, ATTENDANCE),
    where("sessionId", "==", sessionId),
    where("studentId", "==", studentId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as AttendanceDoc;
}

export async function getSessionAttendance(sessionId: string): Promise<AttendanceDoc[]> {
  const q = query(collection(db, ATTENDANCE), where("sessionId", "==", sessionId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AttendanceDoc);
}

export async function getStudentHistory(studentId: string): Promise<AttendanceDoc[]> {
  const q = query(collection(db, ATTENDANCE), where("studentId", "==", studentId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AttendanceDoc);
}

export function subscribeToSessionAttendance(
  sessionId: string,
  callback: (records: AttendanceDoc[]) => void
): Unsubscribe {
  const q = query(collection(db, ATTENDANCE), where("sessionId", "==", sessionId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AttendanceDoc));
  });
}

export function subscribeToMyAttendance(
  sessionId: string,
  studentId: string,
  callback: (record: AttendanceDoc | null) => void
): Unsubscribe {
  const q = query(
    collection(db, ATTENDANCE),
    where("sessionId", "==", sessionId),
    where("studentId", "==", studentId)
  );
  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      callback(null);
      return;
    }
    const d = snap.docs[0];
    callback({ id: d.id, ...d.data() } as AttendanceDoc);
  });
}

export async function teacherOverride(
  attendanceId: string,
  decision: "present" | "absent"
): Promise<void> {
  await updateDoc(doc(db, ATTENDANCE, attendanceId), {
    teacherOverride: decision,
    trustScore: decision === "present" ? "present" : "absent",
  });
}
