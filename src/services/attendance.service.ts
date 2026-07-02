import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  arrayUnion,
  increment,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { computeTrustScore } from "@/types";
import { isMockMode, mockDb } from "@/utils/mock-db";
import type { AttendanceDoc, FaceVerificationResult, GeoLocation, PeerVerification, QRPayload } from "@/types";

const ATTENDANCE = "attendance";

/**
 * Check in student — writes directly to Firestore (open rules).
 * TODO: Khi có Blaze plan, chuyển lại dùng Cloud Function scanTeacher
 * để validate QR/HMAC server-side.
 */
export async function checkInStudent(
  sessionId: string,
  classId: string,
  studentId: string,
  studentName: string,
  studentMssv?: string,
  _qrPayload?: QRPayload,
  location?: GeoLocation,
  config?: { faceRequired?: boolean; peerRequired?: boolean },
  review?: { needsReview?: boolean; reason?: string }
): Promise<AttendanceDoc> {
  // Điểm danh xong nghĩa là đã hoàn tất các bước BẮT BUỘC của phiên: với phiên
  // không yêu cầu face/peer thì SV "present" ngay. Tính trustScore theo config
  // phiên thay vì ghi cứng "absent" — nếu không, màn Phiên điểm danh (đếm
  // === "present") và máy chiếu (đếm !== "absent") sẽ KHÔNG thấy SV cho tới khi
  // phiên kết thúc (lúc đó backfill mới tính lại). TeacherMonitor tính lại
  // client-side nên không bị, nhưng 2 màn kia đọc thẳng field này.
  const baseScore = computeTrustScore(0, undefined, config);
  // GPS thiếu / QR cũ → hạ "present" xuống "review" để GV xem xét
  const needsReview = !!review?.needsReview;
  const initialScore = needsReview && baseScore === "present" ? ("review" as const) : baseScore;
  const reviewFields = needsReview
    ? { needsReview: true, ...(review?.reason ? { reviewReason: review.reason } : {}) }
    : {};

  if (isMockMode()) {
    const existing = mockDb.getMyAttendance(sessionId, studentId);
    if (existing) return existing;
    const created = mockDb.createAttendance({
      sessionId, classId, studentId, studentName,
      ...(studentMssv ? { studentMssv } : {}),
      checkedInAt: Date.now(), peerVerifications: [], peerCount: 0, trustScore: initialScore,
      ...reviewFields,
    });
    mockDb.notifyAttendanceChange(sessionId, studentId);
    return created;
  }

  // Check if already checked in
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

  // Create new attendance record with location
  const record: Omit<AttendanceDoc, "id"> = {
    sessionId,
    classId,
    studentId,
    studentName,
    ...(studentMssv ? { studentMssv } : {}),
    checkedInAt: Date.now(),
    peerVerifications: [],
    peerCount: 0,
    trustScore: initialScore,
    ...reviewFields,
    ...(location ? { location } : {}),
  };

  const ref = await addDoc(collection(db, ATTENDANCE), record);
  return { id: ref.id, ...record } as AttendanceDoc;
}

export async function addPeerVerification(
  attendanceId: string,
  peer: PeerVerification
): Promise<void> {
  if (isMockMode()) {
    const a = mockDb.getAttendance(attendanceId);
    if (!a) return;
    if (a.peerVerifications.some(v => v.peerId === peer.peerId)) return;
    a.peerVerifications.push(peer);
    a.peerCount++;
    a.trustScore = computeTrustScore(a.peerCount, a.faceVerification);
    mockDb.notifyAttendanceChange(a.sessionId, a.studentId);
    return;
  }

  await updateDoc(doc(db, ATTENDANCE, attendanceId), {
    peerVerifications: arrayUnion(peer),
    peerCount: increment(1),
  });
}

/**
 * Bidirectional peer verification — writes directly to Firestore.
 * TODO: Khi có Blaze plan, chuyển lại dùng Cloud Function scanPeer.
 */
export async function addBidirectionalPeerVerification(
  sessionId: string,
  scannerId: string,
  scannerName: string,
  peerId: string,
  peerName: string,
  qrNonce: string,
  _qrPayload?: QRPayload,
  _attendanceId?: string
): Promise<{ scannerUpdated: boolean; peerUpdated: boolean }> {
  if (isMockMode()) {
    const result = { scannerUpdated: false, peerUpdated: false };
    const scannerAtt = mockDb.getMyAttendance(sessionId, scannerId);
    if (scannerAtt && !scannerAtt.peerVerifications.some((v) => v.peerId === peerId)) {
      scannerAtt.peerVerifications.push({ peerId, peerName, verifiedAt: Date.now(), qrNonce });
      scannerAtt.peerCount++;
      scannerAtt.trustScore = computeTrustScore(scannerAtt.peerCount, scannerAtt.faceVerification);
      mockDb.notifyAttendanceChange(sessionId, scannerId);
      result.scannerUpdated = true;
    }
    const peerAtt = mockDb.getMyAttendance(sessionId, peerId);
    if (peerAtt && !peerAtt.peerVerifications.some((v) => v.peerId === scannerId)) {
      peerAtt.peerVerifications.push({ peerId: scannerId, peerName: scannerName, verifiedAt: Date.now(), qrNonce });
      peerAtt.peerCount++;
      peerAtt.trustScore = computeTrustScore(peerAtt.peerCount, peerAtt.faceVerification);
      mockDb.notifyAttendanceChange(sessionId, peerId);
      result.peerUpdated = true;
    }
    return result;
  }

  const result = { scannerUpdated: false, peerUpdated: false };
  const now = Date.now();

  // Update scanner's attendance
  const scannerQ = query(
    collection(db, ATTENDANCE),
    where("sessionId", "==", sessionId),
    where("studentId", "==", scannerId)
  );
  const scannerSnap = await getDocs(scannerQ);
  if (!scannerSnap.empty) {
    const scannerDoc = scannerSnap.docs[0];
    const scannerData = scannerDoc.data() as Omit<AttendanceDoc, "id">;
    if (!scannerData.peerVerifications?.some(v => v.peerId === peerId)) {
      const newPeer: PeerVerification = { peerId, peerName, verifiedAt: now, qrNonce };
      const newCount = (scannerData.peerCount || 0) + 1;
      await updateDoc(scannerDoc.ref, {
        peerVerifications: arrayUnion(newPeer),
        peerCount: newCount,
        trustScore: computeTrustScore(newCount, scannerData.faceVerification),
      });
      result.scannerUpdated = true;
    }
  }

  // Update peer's attendance (bidirectional)
  const peerQ = query(
    collection(db, ATTENDANCE),
    where("sessionId", "==", sessionId),
    where("studentId", "==", peerId)
  );
  const peerSnap = await getDocs(peerQ);
  if (!peerSnap.empty) {
    const peerDoc = peerSnap.docs[0];
    const peerData = peerDoc.data() as Omit<AttendanceDoc, "id">;
    if (!peerData.peerVerifications?.some(v => v.peerId === scannerId)) {
      const newPeer: PeerVerification = { peerId: scannerId, peerName: scannerName, verifiedAt: now, qrNonce };
      const newCount = (peerData.peerCount || 0) + 1;
      await updateDoc(peerDoc.ref, {
        peerVerifications: arrayUnion(newPeer),
        peerCount: newCount,
        trustScore: computeTrustScore(newCount, peerData.faceVerification),
      });
      result.peerUpdated = true;
    }
  }

  return result;
}

export async function getMyAttendance(
  sessionId: string,
  studentId: string
): Promise<AttendanceDoc | null> {
  if (isMockMode()) return mockDb.getMyAttendance(sessionId, studentId);
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
  if (isMockMode()) return mockDb.getSessionAttendance(sessionId);
  const q = query(collection(db, ATTENDANCE), where("sessionId", "==", sessionId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AttendanceDoc);
}

export async function getStudentHistory(studentId: string): Promise<AttendanceDoc[]> {
  if (isMockMode()) return mockDb.getStudentHistory(studentId);
  const q = query(collection(db, ATTENDANCE), where("studentId", "==", studentId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AttendanceDoc);
}

export function subscribeToSessionAttendance(
  sessionId: string,
  callback: (records: AttendanceDoc[]) => void
): Unsubscribe {
  if (isMockMode()) {
    callback(mockDb.getSessionAttendance(sessionId));
    return mockDb.subscribeAttendanceForSession(sessionId, () => {
      callback(mockDb.getSessionAttendance(sessionId));
    });
  }
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
  if (isMockMode()) {
    callback(mockDb.getMyAttendance(sessionId, studentId));
    return mockDb.subscribeAttendanceForStudent(sessionId, studentId, () => {
      callback(mockDb.getMyAttendance(sessionId, studentId));
    });
  }
  const q = query(
    collection(db, ATTENDANCE),
    where("sessionId", "==", sessionId),
    where("studentId", "==", studentId)
  );
  return onSnapshot(q, (snap) => {
    if (snap.empty) { callback(null); return; }
    const d = snap.docs[0];
    callback({ id: d.id, ...d.data() } as AttendanceDoc);
  });
}

export async function updateFaceVerification(
  attendanceId: string,
  faceResult: FaceVerificationResult
): Promise<void> {
  if (isMockMode()) {
    const a = mockDb.getAttendance(attendanceId);
    if (!a) return;
    a.faceVerification = faceResult;
    a.trustScore = computeTrustScore(a.peerCount, faceResult);
    mockDb.notifyAttendanceChange(a.sessionId, a.studentId);
    return;
  }

  // Read current peerCount so we can sync trustScore atomically with the
  // face result write (mock path already does this — keep parity).
  const ref = doc(db, ATTENDANCE, attendanceId);
  const snap = await getDoc(ref);
  const peerCount = snap.exists() ? ((snap.data().peerCount as number) ?? 0) : 0;
  await updateDoc(ref, {
    faceVerification: faceResult,
    trustScore: computeTrustScore(peerCount, faceResult),
  });
}

export async function teacherOverride(
  attendanceId: string,
  decision: "present" | "absent"
): Promise<void> {
  if (isMockMode()) {
    const a = mockDb.getAttendance(attendanceId);
    if (!a) return;
    a.teacherOverride = decision;
    a.trustScore = decision === "present" ? "present" : "absent";
    mockDb.notifyAttendanceChange(a.sessionId, a.studentId);
    return;
  }

  await updateDoc(doc(db, ATTENDANCE, attendanceId), {
    teacherOverride: decision,
    trustScore: decision === "present" ? "present" : "absent",
  });
}

export async function manualCheckIn(
  sessionId: string,
  studentId: string,
  studentName: string,
  reason: string,
  decision: "present" | "absent" = "present",
  manualBy?: string
): Promise<{ id: string; created?: boolean; updated?: boolean }> {
  // Resolve classId from session — without it, new manual records would be
  // invisible to per-class queries (analytics, fraud reports, history).
  const resolveClassId = async (): Promise<string> => {
    if (isMockMode()) return mockDb.getSession(sessionId)?.classId ?? "";
    const sessSnap = await getDoc(doc(db, "sessions", sessionId));
    return sessSnap.exists() ? ((sessSnap.data().classId as string) ?? "") : "";
  };

  if (isMockMode()) {
    const existing = mockDb.getMyAttendance(sessionId, studentId);
    if (existing) {
      existing.teacherOverride = decision;
      existing.trustScore = decision;
      (existing as any).manualReason = reason;
      (existing as any).manualAt = Date.now();
      if (manualBy) (existing as any).manualBy = manualBy;
      mockDb.notifyAttendanceChange(sessionId, studentId);
      return { id: existing.id, updated: true };
    }
    const classId = await resolveClassId();
    const record = mockDb.createAttendance({
      sessionId, classId, studentId, studentName,
      checkedInAt: Date.now(), peerVerifications: [], peerCount: 0,
      trustScore: decision, teacherOverride: decision,
      ...(manualBy ? { manualBy } : {}),
    });
    mockDb.notifyAttendanceChange(sessionId, studentId);
    return { id: record.id, created: true };
  }

  // Check if student already has attendance
  const q = query(
    collection(db, ATTENDANCE),
    where("sessionId", "==", sessionId),
    where("studentId", "==", studentId)
  );
  const existing = await getDocs(q);

  if (!existing.empty) {
    const d = existing.docs[0];
    await updateDoc(d.ref, {
      teacherOverride: decision,
      trustScore: decision,
      manualReason: reason,
      manualAt: Date.now(),
      ...(manualBy ? { manualBy } : {}),
    });
    return { id: d.id, updated: true };
  }

  const classId = await resolveClassId();
  const record = {
    sessionId,
    classId,
    studentId,
    studentName,
    checkedInAt: Date.now(),
    peerVerifications: [],
    peerCount: 0,
    trustScore: decision,
    teacherOverride: decision,
    manualReason: reason,
    manualAt: Date.now(),
    ...(manualBy ? { manualBy } : {}),
  };
  const ref = await addDoc(collection(db, ATTENDANCE), record);
  return { id: ref.id, created: true };
}
