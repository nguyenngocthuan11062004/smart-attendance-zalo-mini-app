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
import { isMockMode, mockDb } from "@/utils/mock-db";
import { withRetry } from "@/utils/retry";
import { callWithFallback } from "@/utils/cloudFallback";
import { getAccessToken } from "@/services/auth.service";
import { enqueueOperation, registerQueueHandler } from "@/utils/offlineQueue";
import type { AttendanceDoc, FaceVerificationResult, PeerVerification, QRPayload, TrustScore } from "@/types";

const ATTENDANCE = "attendance";

/**
 * Check in student via Cloud Function (server validates QR).
 * Falls back to direct Firestore write if CF unavailable.
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

  return callWithFallback(
    "scanTeacher",
    { qrPayload, sessionId, accessToken },
    async () => {
      // Fallback: direct Firestore write (client-side validation already done)
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
        sessionId, classId, studentId, studentName,
        checkedInAt: Date.now(), peerVerifications: [], peerCount: 0, trustScore: "absent",
      };
      try {
        await setDoc(ref, record);
      } catch {
        // Both CF and Firestore failed — enqueue for later
        enqueueOperation("checkIn", { sessionId, classId, studentId, studentName });
        return { id: ref.id, ...record };
      }
      return { id: ref.id, ...record };
    }
  );
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

  const ref = doc(db, ATTENDANCE, attendanceId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as Omit<AttendanceDoc, "id">;
  if (data.peerVerifications.some((v) => v.peerId === peer.peerId)) return;
  const newCount = data.peerCount + 1;
  await updateDoc(ref, {
    peerVerifications: arrayUnion(peer),
    peerCount: newCount,
    trustScore: computeTrustScore(newCount, data.faceVerification),
  });
}

/**
 * Bidirectional peer verification via Cloud Function.
 * Falls back to direct Firestore writes if CF unavailable.
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

  return callWithFallback(
    "scanPeer",
    { qrPayload, sessionId, attendanceId, accessToken },
    async () => {
      // Fallback: direct Firestore writes
      const result = { scannerUpdated: false, peerUpdated: false };

      const scannerAtt = await getMyAttendance(sessionId, scannerId);
      if (scannerAtt) {
        const alreadyHasPeer = scannerAtt.peerVerifications.some((v) => v.peerId === peerId);
        if (!alreadyHasPeer) {
          await withRetry(
            () => addPeerVerification(scannerAtt.id, { peerId, peerName, verifiedAt: Date.now(), qrNonce }),
            { maxRetries: 3, baseDelay: 500 }
          );
          result.scannerUpdated = true;
        }
      }

      const peerAtt = await getMyAttendance(sessionId, peerId);
      if (peerAtt) {
        const alreadyHasScanner = peerAtt.peerVerifications.some((v) => v.peerId === scannerId);
        if (!alreadyHasScanner) {
          await withRetry(
            () => addPeerVerification(peerAtt.id, { peerId: scannerId, peerName: scannerName, verifiedAt: Date.now(), qrNonce }),
            { maxRetries: 3, baseDelay: 500 }
          );
          result.peerUpdated = true;
        }
      }

      return result;
    }
  );
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

  const ref = doc(db, ATTENDANCE, attendanceId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as Omit<AttendanceDoc, "id">;
  const newTrustScore = computeTrustScore(data.peerCount, faceResult);
  await updateDoc(ref, { faceVerification: faceResult, trustScore: newTrustScore });
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
  await updateDoc(doc(db, ATTENDANCE, attendanceId), {
    teacherOverride: decision,
    trustScore: decision === "present" ? "present" : "absent",
  });
}

// --- Offline queue handler registration ---
// Re-process queued check-ins when network restores
registerQueueHandler("checkIn", async (payload) => {
  const { sessionId, classId, studentId, studentName } = payload as {
    sessionId: string; classId: string; studentId: string; studentName: string;
  };
  const q = query(
    collection(db, ATTENDANCE),
    where("sessionId", "==", sessionId),
    where("studentId", "==", studentId)
  );
  const existing = await getDocs(q);
  if (!existing.empty) return; // Already checked in

  const ref = doc(collection(db, ATTENDANCE));
  await setDoc(ref, {
    sessionId, classId, studentId, studentName,
    checkedInAt: Date.now(), peerVerifications: [], peerCount: 0, trustScore: "absent",
  });
});
