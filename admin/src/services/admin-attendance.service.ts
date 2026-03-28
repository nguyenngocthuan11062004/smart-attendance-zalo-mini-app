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
    where("classId", "==", classId),
    orderBy("startedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SessionDoc);
}

export async function getSessionAttendance(sessionId: string): Promise<AttendanceDoc[]> {
  const q = query(
    collection(db, ATTENDANCE_COL),
    where("sessionId", "==", sessionId),
    orderBy("checkedInAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AttendanceDoc);
}

export async function getAttendanceByDateRange(
  startDate: number,
  endDate: number,
  classId?: string
): Promise<AttendanceDoc[]> {
  const constraints: QueryConstraint[] = [
    where("checkedInAt", ">=", startDate),
    where("checkedInAt", "<=", endDate),
  ];

  if (classId) {
    constraints.push(where("classId", "==", classId));
  }

  constraints.push(orderBy("checkedInAt", "desc"));

  const q = query(collection(db, ATTENDANCE_COL), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AttendanceDoc);
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
  const q = query(collection(db, SESSIONS_COL), orderBy("startedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SessionDoc);
}

export async function getActiveSessions(): Promise<SessionDoc[]> {
  const q = query(
    collection(db, SESSIONS_COL),
    where("status", "==", "active")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SessionDoc);
}
