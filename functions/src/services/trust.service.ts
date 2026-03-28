import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const calculateTrustScores = functions.region("asia-southeast1").https.onCall(
  async (data) => {
    const { sessionId } = data;
    if (!sessionId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing sessionId");
    }

    // Read session config for optional steps
    const sessionSnap = await db.collection("sessions").doc(sessionId).get();
    const sessionData = sessionSnap.exists ? sessionSnap.data()! : {};
    const faceReq = sessionData.faceRequired !== false; // default true
    const peerReq = sessionData.peerRequired !== false; // default true

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

      const facePass = !faceReq || faceOk || faceSkipped || !faceAttempted;
      const peerPass = !peerReq || peerCount >= 3;

      let trustScore: string;
      if (facePass && peerPass) trustScore = "present";
      else if (facePass || peerPass) trustScore = "review";
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
