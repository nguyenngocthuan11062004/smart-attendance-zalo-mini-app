import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as CryptoJS from "crypto-js";
import { requireAuth } from "../middleware/auth";

const db = admin.firestore();

export const startSession = functions.region("asia-southeast1").https.onCall(
  requireAuth(async (data, context, userId) => {
    const { classId, className } = data;
    if (!classId || !className) {
      throw new functions.https.HttpsError("invalid-argument", "Missing classId or className");
    }

    const classDoc = await db.collection("classes").doc(classId).get();
    if (!classDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Class not found");
    }
    if (classDoc.data()?.teacherId !== userId) {
      throw new functions.https.HttpsError("permission-denied", "Only class teacher can start session");
    }

    const existing = await db.collection("sessions")
      .where("classId", "==", classId)
      .where("status", "==", "active")
      .get();
    if (!existing.empty) {
      throw new functions.https.HttpsError("already-exists", "Active session already exists");
    }

    const hmacSecret = CryptoJS.lib.WordArray.random(32).toString();
    const ref = db.collection("sessions").doc();
    const session = {
      classId,
      className,
      teacherId: userId,
      status: "active",
      hmacSecret,
      qrRefreshInterval: 15,
      startedAt: Date.now(),
    };

    await ref.set(session);
    return { id: ref.id, ...session };
  })
);

export const endSession = functions.region("asia-southeast1").https.onCall(
  requireAuth(async (data, context, userId) => {
    const { sessionId } = data;
    if (!sessionId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing sessionId");
    }

    const ref = db.collection("sessions").doc(sessionId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new functions.https.HttpsError("not-found", "Session not found");
    }
    if (snap.data()?.teacherId !== userId) {
      throw new functions.https.HttpsError("permission-denied", "Only session teacher can end");
    }

    await ref.update({ status: "ended", endedAt: Date.now() });
    return { success: true };
  })
);
