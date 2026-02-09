import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { requireAuth } from "../middleware/auth";
import { checkRateLimit } from "../middleware/rateLimit";
import { uploadImageToEKYC, checkImageSanity, matchFaces } from "./ekyc.service";
import type { FaceRegistrationDoc, FaceVerificationResult } from "../types/ekyc";

const db = admin.firestore();
const storage = admin.storage();
const FACE_REGISTRATIONS = "face_registrations";

// --- registerFace ---

export const registerFace = functions
  .region("asia-southeast1")
  .https.onCall(
    requireAuth(async (data, _context, userId) => {
      if (!checkRateLimit(`face-reg:${userId}`, 5, 3600_000)) {
        throw new functions.https.HttpsError(
          "resource-exhausted",
          "Too many registration attempts. Try again later."
        );
      }

      const { imageBase64 } = data as { imageBase64: string };
      if (!imageBase64) {
        throw new functions.https.HttpsError("invalid-argument", "Missing imageBase64");
      }

      // 1. Upload to eKYC
      let ekycImageId: string;
      try {
        ekycImageId = await uploadImageToEKYC(imageBase64);
      } catch (err: any) {
        throw new functions.https.HttpsError(
          "internal",
          `Image upload failed: ${err.message}`
        );
      }

      // 2. Sanity check
      let sanityResult: { isValid: boolean; issues: string[] };
      try {
        sanityResult = await checkImageSanity(ekycImageId);
      } catch (err: any) {
        throw new functions.https.HttpsError(
          "internal",
          `Sanity check failed: ${err.message}`
        );
      }

      if (!sanityResult.isValid) {
        return {
          success: false,
          sanityPassed: false,
          issues: sanityResult.issues,
        };
      }

      // 3. Save image to Firebase Storage
      const storagePath = `faces/${userId}/reference.jpg`;
      const bucket = storage.bucket();
      const file = bucket.file(storagePath);
      await file.save(Buffer.from(imageBase64, "base64"), {
        metadata: { contentType: "image/jpeg" },
      });

      // 4. Save registration doc to Firestore
      const regDoc: Omit<FaceRegistrationDoc, "id"> = {
        studentId: userId,
        referenceImagePath: storagePath,
        ekycImageId,
        sanityCheckPassed: true,
        registeredAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Upsert: delete old registration if exists
      const existing = await db
        .collection(FACE_REGISTRATIONS)
        .where("studentId", "==", userId)
        .limit(1)
        .get();
      if (!existing.empty) {
        await existing.docs[0].ref.update({ ...regDoc, updatedAt: Date.now() });
      } else {
        await db.collection(FACE_REGISTRATIONS).add(regDoc);
      }

      // 5. Update user doc: faceRegistered = true
      await db.collection("users").doc(userId).update({ faceRegistered: true });

      return { success: true, sanityPassed: true };
    })
  );

// --- verifyFace ---

export const verifyFace = functions
  .region("asia-southeast1")
  .https.onCall(
    requireAuth(async (data, _context, userId) => {
      if (!checkRateLimit(`face-verify:${userId}`, 10, 3600_000)) {
        throw new functions.https.HttpsError(
          "resource-exhausted",
          "Too many verification attempts. Try again later."
        );
      }

      const { imageBase64, sessionId, attendanceId } = data as {
        imageBase64: string;
        sessionId: string;
        attendanceId: string;
      };

      if (!imageBase64 || !sessionId || !attendanceId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing imageBase64, sessionId, or attendanceId"
        );
      }

      // 1. Look up student's face registration
      const regSnap = await db
        .collection(FACE_REGISTRATIONS)
        .where("studentId", "==", userId)
        .limit(1)
        .get();

      if (regSnap.empty) {
        return {
          matched: false,
          confidence: 0,
          error: "no_registration",
        } as Partial<FaceVerificationResult>;
      }

      const registration = regSnap.docs[0].data() as FaceRegistrationDoc;

      // 2. Upload selfie to eKYC
      let selfieImageId: string;
      try {
        selfieImageId = await uploadImageToEKYC(imageBase64);
      } catch (err: any) {
        return {
          matched: false,
          confidence: 0,
          error: `upload_failed: ${err.message}`,
        } as Partial<FaceVerificationResult>;
      }

      // 3. Match selfie against reference
      let matchResult: { matched: boolean; confidence: number };
      try {
        matchResult = await matchFaces(selfieImageId, registration.ekycImageId);
      } catch (err: any) {
        return {
          matched: false,
          confidence: 0,
          error: `match_failed: ${err.message}`,
        } as Partial<FaceVerificationResult>;
      }

      // 4. Save selfie to Firebase Storage
      const selfiePath = `faces/${userId}/sessions/${sessionId}.jpg`;
      const bucket = storage.bucket();
      await bucket.file(selfiePath).save(Buffer.from(imageBase64, "base64"), {
        metadata: { contentType: "image/jpeg" },
      });

      // 5. Update attendance record with face verification result
      const faceResult: FaceVerificationResult = {
        matched: matchResult.matched,
        confidence: matchResult.confidence,
        selfieImagePath: selfiePath,
        verifiedAt: Date.now(),
      };

      await db.collection("attendance").doc(attendanceId).update({
        faceVerification: faceResult,
      });

      return {
        matched: matchResult.matched,
        confidence: matchResult.confidence,
      };
    })
  );
