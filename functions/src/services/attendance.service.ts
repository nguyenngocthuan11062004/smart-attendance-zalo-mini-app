import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as CryptoJS from "crypto-js";
import { requireAuth } from "../middleware/auth";
import { checkRateLimit } from "../middleware/rateLimit";

const db = admin.firestore();

// --- Nonce tracking to prevent QR replay attacks ---
// In-memory Map with TTL 120s (longer than QR expiry 90s).
// Upgrade path: use Firestore subcollection `used_nonces` if horizontal scaling needed.
const usedNonces = new Map<string, number>();
const NONCE_TTL_MS = 120_000;

function checkAndRecordNonce(nonce: string): boolean {
  // Clean expired nonces
  const now = Date.now();
  for (const [key, expiry] of usedNonces) {
    if (now > expiry) usedNonces.delete(key);
  }
  if (usedNonces.has(nonce)) return false;
  usedNonces.set(nonce, now + NONCE_TTL_MS);
  return true;
}

/**
 * Haversine formula: calculate distance (meters) between two GPS coordinates.
 */
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function verifyHMAC(payload: any, secret: string): boolean {
  const message = `${payload.type}:${payload.sessionId}:${payload.userId}:${payload.timestamp}:${payload.nonce}`;
  const expected = CryptoJS.HmacSHA256(message, secret).toString();
  return expected === payload.signature;
}

export const scanTeacher = functions.region("asia-southeast1").https.onCall(
  requireAuth(async (data, context, userId) => {
    if (!checkRateLimit(userId, 10, 60_000)) {
      throw new functions.https.HttpsError("resource-exhausted", "Too many requests");
    }

    const { qrPayload, sessionId } = data;
    if (!qrPayload || !sessionId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing data");
    }

    const sessionSnap = await db.collection("sessions").doc(sessionId).get();
    if (!sessionSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Session not found");
    }
    const session = sessionSnap.data()!;

    if (session.status !== "active") {
      throw new functions.https.HttpsError("failed-precondition", "Session is not active");
    }

    // Read hmacSecret from subcollection (fallback to main doc for old sessions)
    const secretSnap = await db.collection("sessions").doc(sessionId).collection("secrets").doc("hmac").get();
    const hmacSecret = secretSnap.exists ? secretSnap.data()!.hmacSecret : session.hmacSecret;

    if (!verifyHMAC(qrPayload, hmacSecret)) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid QR signature");
    }

    if (Date.now() - qrPayload.timestamp > 90_000) {
      throw new functions.https.HttpsError("invalid-argument", "QR expired");
    }

    // Nonce replay check
    if (!checkAndRecordNonce(qrPayload.nonce)) {
      throw new functions.https.HttpsError("invalid-argument", "QR already used");
    }

    // GPS geofencing check (optional — only if session has location set)
    if (session.location && data.studentLocation) {
      const dist = haversineDistance(
        session.location.latitude, session.location.longitude,
        data.studentLocation.latitude, data.studentLocation.longitude
      );
      const radius = session.geoFenceRadius || 200;
      if (dist > radius) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Bạn ở quá xa lớp học (${Math.round(dist)}m, giới hạn ${radius}m)`
        );
      }
    }

    const existing = await db.collection("attendance")
      .where("sessionId", "==", sessionId)
      .where("studentId", "==", userId)
      .get();

    if (!existing.empty) {
      return { id: existing.docs[0].id, ...existing.docs[0].data() };
    }

    const userDoc = await db.collection("users").doc(userId).get();
    const studentName = userDoc.exists ? userDoc.data()?.name || "" : "";

    const ref = db.collection("attendance").doc();
    const record = {
      sessionId,
      classId: session.classId,
      studentId: userId,
      studentName,
      checkedInAt: Date.now(),
      peerVerifications: [],
      peerCount: 0,
      trustScore: "absent",
    };
    await ref.set(record);
    // Return hmacSecret so student can generate peer QR codes after check-in
    return { id: ref.id, ...record, hmacSecret };
  })
);

export const scanPeer = functions.region("asia-southeast1").https.onCall(
  requireAuth(async (data, context, userId) => {
    if (!checkRateLimit(userId, 20, 60_000)) {
      throw new functions.https.HttpsError("resource-exhausted", "Too many requests");
    }

    const { qrPayload, sessionId, attendanceId } = data;
    if (!qrPayload || !sessionId || !attendanceId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing data");
    }

    if (qrPayload.userId === userId) {
      throw new functions.https.HttpsError("invalid-argument", "Cannot scan your own QR");
    }

    const sessionSnap = await db.collection("sessions").doc(sessionId).get();
    if (!sessionSnap.exists || sessionSnap.data()!.status !== "active") {
      throw new functions.https.HttpsError("failed-precondition", "Session not active");
    }

    const session = sessionSnap.data()!;

    // Read hmacSecret from subcollection (fallback to main doc for old sessions)
    const peerSecretSnap = await db.collection("sessions").doc(sessionId).collection("secrets").doc("hmac").get();
    const hmacSecret = peerSecretSnap.exists ? peerSecretSnap.data()!.hmacSecret : session.hmacSecret;

    if (!verifyHMAC(qrPayload, hmacSecret)) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid QR signature");
    }

    if (Date.now() - qrPayload.timestamp > 90_000) {
      throw new functions.https.HttpsError("invalid-argument", "QR expired");
    }

    // Nonce replay check
    if (!checkAndRecordNonce(qrPayload.nonce)) {
      throw new functions.https.HttpsError("invalid-argument", "QR already used");
    }

    // Use a Firestore transaction to prevent race conditions
    // when two students scan each other simultaneously
    const result = await db.runTransaction(async (transaction) => {
      const attRef = db.collection("attendance").doc(attendanceId);
      const attSnap = await transaction.get(attRef);
      if (!attSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Attendance record not found");
      }
      const att = attSnap.data()!;

      // Verify the attendance record belongs to the calling user
      if (att.studentId !== userId) {
        throw new functions.https.HttpsError("permission-denied", "Not your attendance record");
      }

      // 1) Update scanner's record (A scans B → A gets B as peer)
      const alreadyVerified = att.peerVerifications?.some(
        (v: any) => v.peerId === qrPayload.userId
      );
      if (alreadyVerified) {
        throw new functions.https.HttpsError("already-exists", "Already verified this peer");
      }

      const newCount = (att.peerCount || 0) + 1;
      // Compute trust score considering optional steps config
      const faceReq = session.faceRequired !== false;
      const peerReq = session.peerRequired !== false;
      const face = att.faceVerification;
      const faceOk = face?.matched === true && (face?.confidence ?? 0) >= 0.7;
      const faceSkipped = face?.skipped === true;
      const faceAttempted = !!face && !faceSkipped;
      const facePass = !faceReq || faceOk || faceSkipped || !faceAttempted;
      const peerPass = !peerReq || newCount >= 3;
      const trustScore = (facePass && peerPass) ? "present" : (facePass || peerPass) ? "review" : "absent";
      const now = Date.now();

      transaction.update(attRef, {
        peerVerifications: admin.firestore.FieldValue.arrayUnion({
          peerId: qrPayload.userId,
          peerName: "",
          verifiedAt: now,
          qrNonce: qrPayload.nonce,
        }),
        peerCount: newCount,
        trustScore,
      });

      // 2) Update peer's record (A scans B → B also gets A as peer)
      const peerAttQuery = await db.collection("attendance")
        .where("sessionId", "==", sessionId)
        .where("studentId", "==", qrPayload.userId)
        .get();

      if (!peerAttQuery.empty) {
        const peerDocRef = peerAttQuery.docs[0].ref;
        const peerSnap = await transaction.get(peerDocRef);
        const peerData = peerSnap.data()!;
        const peerAlreadyHas = peerData.peerVerifications?.some(
          (v: any) => v.peerId === userId
        );
        if (!peerAlreadyHas) {
          const peerNewCount = (peerData.peerCount || 0) + 1;
          const pFace = peerData.faceVerification;
          const pFaceOk = pFace?.matched === true && (pFace?.confidence ?? 0) >= 0.7;
          const pFaceSkipped = pFace?.skipped === true;
          const pFaceAttempted = !!pFace && !pFaceSkipped;
          const pFacePass = !faceReq || pFaceOk || pFaceSkipped || !pFaceAttempted;
          const pPeerPass = !peerReq || peerNewCount >= 3;
          const peerTrustScore = (pFacePass && pPeerPass) ? "present" : (pFacePass || pPeerPass) ? "review" : "absent";
          transaction.update(peerDocRef, {
            peerVerifications: admin.firestore.FieldValue.arrayUnion({
              peerId: userId,
              peerName: "",
              verifiedAt: now,
              qrNonce: qrPayload.nonce,
            }),
            peerCount: peerNewCount,
            trustScore: peerTrustScore,
          });
        }
      }

      return { peerCount: newCount, trustScore, bidirectional: true };
    });

    return result;
  })
);

export const submitFaceResult = functions.region("asia-southeast1").https.onCall(
  requireAuth(async (data, context, userId) => {
    if (!checkRateLimit(`face_${userId}`, 10, 60_000)) {
      throw new functions.https.HttpsError("resource-exhausted", "Too many requests");
    }

    const { attendanceId, faceResult } = data;
    if (!attendanceId || !faceResult) {
      throw new functions.https.HttpsError("invalid-argument", "Missing data");
    }

    const attRef = db.collection("attendance").doc(attendanceId);
    const attSnap = await attRef.get();
    if (!attSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Attendance record not found");
    }

    const att = attSnap.data()!;
    // Only the student who owns this attendance can submit face result
    if (att.studentId !== userId) {
      throw new functions.https.HttpsError("permission-denied", "Not your attendance record");
    }

    // Read session config for optional steps
    const sessionSnap = await db.collection("sessions").doc(att.sessionId).get();
    const sessionData = sessionSnap.exists ? sessionSnap.data()! : {};
    const faceReq = sessionData.faceRequired !== false;
    const peerReq = sessionData.peerRequired !== false;

    // Compute trust score server-side considering config
    const peerCount = att.peerCount || 0;
    const faceOk = faceResult.matched && faceResult.confidence >= 0.7;
    const facePass = !faceReq || faceOk;
    const peerPass = !peerReq || peerCount >= 3;
    let trustScore: string;
    if (facePass && peerPass) trustScore = "present";
    else if (facePass || peerPass) trustScore = "review";
    else trustScore = "absent";

    await attRef.update({ faceVerification: faceResult, trustScore });
    return { success: true, trustScore };
  })
);

export const manualAttendance = functions.region("asia-southeast1").https.onCall(
  requireAuth(async (data, context, userId) => {
    const { sessionId, studentId, studentName, reason, decision } = data;
    if (!sessionId || !studentId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing sessionId or studentId");
    }
    if (!reason || reason.trim().length === 0) {
      throw new functions.https.HttpsError("invalid-argument", "Reason is required for manual attendance");
    }

    const sessionSnap = await db.collection("sessions").doc(sessionId).get();
    if (!sessionSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Session not found");
    }
    if (sessionSnap.data()!.teacherId !== userId) {
      throw new functions.https.HttpsError("permission-denied", "Only session teacher can mark manual attendance");
    }

    const effectiveDecision = decision === "absent" ? "absent" : "present";
    const now = Date.now();

    // Check if student already has an attendance record
    const existing = await db.collection("attendance")
      .where("sessionId", "==", sessionId)
      .where("studentId", "==", studentId)
      .get();

    if (!existing.empty) {
      // Update existing record
      const docRef = existing.docs[0].ref;
      await docRef.update({
        teacherOverride: effectiveDecision,
        trustScore: effectiveDecision,
        manualBy: userId,
        manualReason: reason.trim(),
        manualAt: now,
      });
      return { id: existing.docs[0].id, updated: true };
    }

    // Create new attendance record for absent student
    const session = sessionSnap.data()!;
    const ref = db.collection("attendance").doc();
    const record = {
      sessionId,
      classId: session.classId,
      studentId,
      studentName: studentName || studentId,
      checkedInAt: now,
      peerVerifications: [],
      peerCount: 0,
      trustScore: effectiveDecision,
      teacherOverride: effectiveDecision,
      manualBy: userId,
      manualReason: reason.trim(),
      manualAt: now,
    };
    await ref.set(record);
    return { id: ref.id, created: true };
  })
);

export const reviewAttendance = functions.region("asia-southeast1").https.onCall(
  requireAuth(async (data, context, userId) => {
    const { attendanceId, decision } = data;
    if (!attendanceId || !["present", "absent"].includes(decision)) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid data");
    }

    const attRef = db.collection("attendance").doc(attendanceId);
    const attSnap = await attRef.get();
    if (!attSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Record not found");
    }

    const sessionSnap = await db.collection("sessions").doc(attSnap.data()!.sessionId).get();
    if (!sessionSnap.exists || sessionSnap.data()!.teacherId !== userId) {
      throw new functions.https.HttpsError("permission-denied", "Only teacher can review");
    }

    await attRef.update({
      teacherOverride: decision,
      trustScore: decision === "present" ? "present" : "absent",
    });

    return { success: true };
  })
);
