import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const calculateTrustScores = functions.region("asia-southeast1").https.onCall(
  async (data) => {
    const { sessionId } = data;
    if (!sessionId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing sessionId");
    }

    const records = await db.collection("attendance")
      .where("sessionId", "==", sessionId)
      .get();

    const batch = db.batch();
    let updated = 0;

    records.forEach((doc) => {
      const record = doc.data();
      if (record.teacherOverride) return;

      const peerCount = record.peerCount || 0;
      const face = record.faceVerification;
      const faceOk = face?.matched === true && (face?.confidence ?? 0) >= 0.7;
      const faceSkipped = face?.skipped === true;
      const faceAttempted = !!face && !faceSkipped;

      let trustScore: string;
      if (peerCount >= 3 && (faceOk || faceSkipped || !faceAttempted)) trustScore = "present";
      else if (peerCount >= 3 && faceAttempted && !faceOk) trustScore = "review";
      else if (peerCount >= 1 && faceOk) trustScore = "review";
      else if (peerCount >= 1) trustScore = "review";
      else trustScore = "absent";

      if (record.trustScore !== trustScore) {
        batch.update(doc.ref, { trustScore });
        updated++;
      }
    });

    if (updated > 0) {
      await batch.commit();
    }

    return { updated, total: records.size };
  }
);
