import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as CryptoJS from "crypto-js";
import { requireAuth } from "../middleware/auth";
import { checkRateLimit } from "../middleware/rateLimit";

const db = admin.firestore();

// --- Nonce tracking to prevent QR replay attacks ---
// In-memory Map with TTL 120s (longer than QR expiry 60s).
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

    if (!verifyHMAC(qrPayload, session.hmacSecret)) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid QR signature");
    }

    if (Date.now() - qrPayload.timestamp > 60_000) {
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
    return { id: ref.id, ...record };
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
    if (!verifyHMAC(qrPayload, session.hmacSecret)) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid QR signature");
    }

    if (Date.now() - qrPayload.timestamp > 60_000) {
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

      // 1) Update scanner's record (A scans B → A gets B as peer)
      const alreadyVerified = att.peerVerifications?.some(
        (v: any) => v.peerId === qrPayload.userId
      );
      if (alreadyVerified) {
        throw new functions.https.HttpsError("already-exists", "Already verified this peer");
      }

      const newCount = (att.peerCount || 0) + 1;
      const trustScore = newCount >= 3 ? "present" : newCount >= 1 ? "review" : "absent";
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
          const peerTrustScore = peerNewCount >= 3 ? "present" : peerNewCount >= 1 ? "review" : "absent";
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
