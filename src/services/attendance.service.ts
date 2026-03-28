import {
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/config/firebase";
import { computeTrustScore } from "@/types";
import { isMockMode, mockDb } from "@/utils/mock-db";
import { getAccessToken } from "@/services/auth.service";
import type { AttendanceDoc, FaceVerificationResult, PeerVerification, QRPayload } from "@/types";

const ATTENDANCE = "attendance";

/**
 * Check in student via Cloud Function (server validates QR).
 * No client-side fallback — all attendance creates go through Cloud Functions
 * to enforce server-side QR/HMAC validation.
 */
export async function checkInStudent(
  sessionId: string,
  classId: string,
  studentId: string,
  studentName: string,
  qrPayload?: QRPayload
): Promise<AttendanceDoc> {
  if (isMockMode()) {
    const existing = mockDb.getMyAttendance(sessionId, studentId);
    if (existing) return existing;
    return mockDb.createAttendance({
      sessionId, classId, studentId, studentName,
      checkedInAt: Date.now(), peerVerifications: [], peerCount: 0, trustScore: "absent",
    });
  }

  const accessToken = await getAccessToken();
  const fn = httpsCallable<any, AttendanceDoc>(functions, "scanTeacher");
  const result = await fn({ qrPayload, sessionId, accessToken });
  return result.data;
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
    return;
  }

  // Peer verification now goes through scanPeer Cloud Function (server-side validation)
  // Direct client writes are blocked by Firestore rules
  console.warn("addPeerVerification: Direct client writes disabled. Use scanPeer Cloud Function.");
}

/**
 * Bidirectional peer verification via Cloud Function.
 * No client-side fallback — all peer verification goes through Cloud Functions
 * to enforce server-side QR/HMAC validation.
 */
export async function addBidirectionalPeerVerification(
  sessionId: string,
  scannerId: string,
  scannerName: string,
  peerId: string,
  peerName: string,
  qrNonce: string,
  qrPayload?: QRPayload,
  attendanceId?: string
): Promise<{ scannerUpdated: boolean; peerUpdated: boolean }> {
  if (isMockMode()) {
    const result = { scannerUpdated: false, peerUpdated: false };
    const scannerAtt = mockDb.getMyAttendance(sessionId, scannerId);
    if (scannerAtt && !scannerAtt.peerVerifications.some((v) => v.peerId === peerId)) {
      scannerAtt.peerVerifications.push({ peerId, peerName, verifiedAt: Date.now(), qrNonce });
      scannerAtt.peerCount++;
      scannerAtt.trustScore = computeTrustScore(scannerAtt.peerCount, scannerAtt.faceVerification);
      result.scannerUpdated = true;
    }
    const peerAtt = mockDb.getMyAttendance(sessionId, peerId);
    if (peerAtt && !peerAtt.peerVerifications.some((v) => v.peerId === scannerId)) {
      peerAtt.peerVerifications.push({ peerId: scannerId, peerName: scannerName, verifiedAt: Date.now(), qrNonce });
      peerAtt.peerCount++;
      peerAtt.trustScore = computeTrustScore(peerAtt.peerCount, peerAtt.faceVerification);
      result.peerUpdated = true;
    }
    return result;
  }

  const accessToken = await getAccessToken();
  const fn = httpsCallable<any, { peerCount: number; trustScore: string; bidirectional: boolean }>(functions, "scanPeer");
  const result = await fn({ qrPayload, sessionId, attendanceId, accessToken });
  return { scannerUpdated: true, peerUpdated: result.data.bidirectional };
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
    // Mock: call once with current data
    callback(mockDb.getSessionAttendance(sessionId));
    return () => {};
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
    return () => {};
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
    return;
  }

  const accessToken = await getAccessToken();
  const fn = httpsCallable(functions, "submitFaceResult");
  await fn({ attendanceId, faceResult, accessToken });
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
    return;
  }

  const accessToken = await getAccessToken();
  const fn = httpsCallable(functions, "reviewAttendance");
  await fn({ attendanceId, decision, accessToken });
}

export async function manualCheckIn(
  sessionId: string,
  studentId: string,
  studentName: string,
  reason: string,
  decision: "present" | "absent" = "present"
): Promise<{ id: string; created?: boolean; updated?: boolean }> {
  if (isMockMode()) {
    const existing = mockDb.getMyAttendance(sessionId, studentId);
    if (existing) {
      existing.teacherOverride = decision;
      existing.trustScore = decision;
      (existing as any).manualReason = reason;
      (existing as any).manualAt = Date.now();
      return { id: existing.id, updated: true };
    }
    const record = mockDb.createAttendance({
      sessionId, classId: "", studentId, studentName,
      checkedInAt: Date.now(), peerVerifications: [], peerCount: 0,
      trustScore: decision, teacherOverride: decision,
    });
    return { id: record.id, created: true };
  }

  const accessToken = await getAccessToken();
  const fn = httpsCallable<any, { id: string; created?: boolean; updated?: boolean }>(functions, "manualAttendance");
  const result = await fn({ sessionId, studentId, studentName, reason, decision, accessToken });
  return result.data;
}
