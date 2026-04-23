import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getCountFromServer,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import type { AttendanceDoc, SessionDoc } from "@/types";

const ATTENDANCE_COL = "attendance";
const SESSIONS_COL = "sessions";

export async function getSessionsByClass(classId: string): Promise<SessionDoc[]> {
  const q = query(
    collection(db, SESSIONS_COL),
    where("classId", "==", classId)
  );
  const snap = await getDocs(q);
  const sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SessionDoc);
  return sessions.sort((a, b) => b.startedAt - a.startedAt);
}

export async function getSessionAttendance(sessionId: string): Promise<AttendanceDoc[]> {
  const q = query(
    collection(db, ATTENDANCE_COL),
    where("sessionId", "==", sessionId)
  );
  const snap = await getDocs(q);
  const records = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AttendanceDoc);
  return records.sort((a, b) => a.checkedInAt - b.checkedInAt);
}

export async function getAttendanceByDateRange(
  startDate: number,
  endDate: number,
  classId?: string
): Promise<AttendanceDoc[]> {
  // Lấy tất cả rồi filter client-side — tránh compound index
  const snap = await getDocs(collection(db, ATTENDANCE_COL));
  let records = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AttendanceDoc);

  records = records.filter((r) => r.checkedInAt >= startDate && r.checkedInAt <= endDate);
  if (classId) {
    records = records.filter((r) => r.classId === classId);
  }

  return records.sort((a, b) => b.checkedInAt - a.checkedInAt);
}

export async function getAttendanceStats(): Promise<{
  totalRecords: number;
  presentCount: number;
  reviewCount: number;
  absentCount: number;
}> {
  const [totalSnap, presentSnap, reviewSnap] = await Promise.all([
    getCountFromServer(query(collection(db, ATTENDANCE_COL))),
    getCountFromServer(
      query(collection(db, ATTENDANCE_COL), where("trustScore", "==", "present"))
    ),
    getCountFromServer(
      query(collection(db, ATTENDANCE_COL), where("trustScore", "==", "review"))
    ),
  ]);

  const total = totalSnap.data().count;
  const present = presentSnap.data().count;
  const review = reviewSnap.data().count;

  return {
    totalRecords: total,
    presentCount: present,
    reviewCount: review,
    absentCount: total - present - review,
  };
}

export async function getAllSessions(): Promise<SessionDoc[]> {
  const snap = await getDocs(collection(db, SESSIONS_COL));
  const sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SessionDoc);
  return sessions.sort((a, b) => b.startedAt - a.startedAt);
}

export async function getActiveSessions(): Promise<SessionDoc[]> {
  const q = query(
    collection(db, SESSIONS_COL),
    where("status", "==", "active")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SessionDoc);
}
