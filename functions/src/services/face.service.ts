import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { requireAuth } from "../middleware/auth";
import { checkRateLimit } from "../middleware/rateLimit";
import { generateSession, uploadImageToEKYC, checkImageSanity, matchFaces, getOCRResult, isEKYCConfigured } from "./ekyc.service";
import type { FaceRegistrationDoc, FaceVerificationResult } from "../types/ekyc";

const db = admin.firestore();
const storage = admin.storage();
const FACE_REGISTRATIONS = "face_registrations";

// --- registerCCCD ---

export const registerCCCD = functions
  .region("asia-southeast1")
  .https.onCall(
    requireAuth(async (data, _context, userId) => {
      if (!checkRateLimit(`cccd-reg:${userId}`, 5, 3600_000)) {
        throw new functions.https.HttpsError(
          "resource-exhausted",
          "Too many registration attempts. Try again later."
        );
      }

      const { frontBase64, backBase64, selfieBase64 } = data as {
        frontBase64: string;
        backBase64: string;
        selfieBase64: string;
      };

      if (!frontBase64 || !backBase64 || !selfieBase64) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing frontBase64, backBase64, or selfieBase64"
        );
      }

      const bucket = storage.bucket();

      // Save all images to Firebase Storage
      const frontPath = `faces/${userId}/cccd_front.jpg`;
      const backPath = `faces/${userId}/cccd_back.jpg`;
      const selfiePath = `faces/${userId}/reference.jpg`;

      await Promise.all([
        bucket.file(frontPath).save(Buffer.from(frontBase64, "base64"), {
          metadata: { contentType: "image/jpeg" },
        }),
        bucket.file(backPath).save(Buffer.from(backBase64, "base64"), {
          metadata: { contentType: "image/jpeg" },
        }),
        bucket.file(selfiePath).save(Buffer.from(selfieBase64, "base64"), {
          metadata: { contentType: "image/jpeg" },
        }),
      ]);

      let ocrData: Record<string, any> = {};
      let faceMatchConfidence = 0;
      let faceMatched = false;
      let ekycImageId = "pending";

      if (isEKYCConfigured()) {
        try {
          // 1. Create eKYC session
          const sessionId = await generateSession(process.env.EKYC_API_KEY!);

          // 2. Upload front CCCD as idcard
          const frontPhotoId = await uploadImageToEKYC(frontBase64, sessionId, "idcard");
          ekycImageId = String(frontPhotoId);

          // 3. Upload back CCCD as back_idcard
          await uploadImageToEKYC(backBase64, sessionId, "back_idcard");

          // 4. Sanity check
          const sanityResult = await checkImageSanity(sessionId);
          if (!sanityResult.isValid) {
            return {
              success: false,
              step: "sanity_check",
              issues: sanityResult.issues,
            };
          }

          // 5. OCR extract info from CCCD
          ocrData = await getOCRResult(sessionId);

          // 6. Upload selfie for face matching
          await uploadImageToEKYC(selfieBase64, sessionId, "selfie");

          // 7. Face matching (CCCD photo vs selfie)
          const matchResult = await matchFaces(sessionId);
          faceMatched = matchResult.matched;
          faceMatchConfidence = matchResult.confidence;

          if (!faceMatched) {
            return {
              success: false,
              step: "face_match",
              ocrData,
              faceMatchConfidence,
              message: "Khuon mat khong khop voi anh CCCD",
            };
          }
        } catch (err: any) {
          // eKYC failed but images are saved to Storage
          return {
            success: false,
            step: "ekyc_error",
            message: err.message || "eKYC service error",
          };
        }
      }

      // Save registration doc to Firestore
      const regDoc: Omit<FaceRegistrationDoc, "id"> = {
        studentId: userId,
        referenceImagePath: selfiePath,
        ekycImageId,
        sanityCheckPassed: true,
        cccdFrontPath: frontPath,
        cccdBackPath: backPath,
        ocrData,
        faceMatchConfidence,
        registeredAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Upsert: update old registration if exists
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

      // Update user doc with CCCD data + faceRegistered
      const userUpdate: Record<string, any> = {
        faceRegistered: true,
        cccdRegistered: true,
      };
      if (ocrData.full_name) userUpdate.cccdName = ocrData.full_name;
      if (ocrData.id_number) userUpdate.cccdNumber = ocrData.id_number;
      if (ocrData.date_of_birth) userUpdate.cccdDob = ocrData.date_of_birth;
      if (ocrData.gender) userUpdate.cccdGender = ocrData.gender;
      if (ocrData.place_of_residence) userUpdate.cccdAddress = ocrData.place_of_residence;

      await db.collection("users").doc(userId).update(userUpdate);

      return {
        success: true,
        ocrData,
        faceMatched: true,
        faceMatchConfidence,
      };
    })
  );

// --- registerFace (legacy, kept for backward compat) ---

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

      const storagePath = `faces/${userId}/reference.jpg`;
      const bucket = storage.bucket();
      await bucket.file(storagePath).save(Buffer.from(imageBase64, "base64"), {
        metadata: { contentType: "image/jpeg" },
      });

      const regDoc: Omit<FaceRegistrationDoc, "id"> = {
        studentId: userId,
        referenceImagePath: storagePath,
        ekycImageId: "pending",
        sanityCheckPassed: true,
        registeredAt: Date.now(),
        updatedAt: Date.now(),
      };

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

      const { imageBase64, sessionId: attSessionId, attendanceId } = data as {
        imageBase64: string;
        sessionId: string;
        attendanceId: string;
      };

      if (!imageBase64 || !attSessionId || !attendanceId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing imageBase64, sessionId, or attendanceId"
        );
      }

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

      const selfiePath = `faces/${userId}/sessions/${attSessionId}.jpg`;
      const bucket = storage.bucket();
      await bucket.file(selfiePath).save(Buffer.from(imageBase64, "base64"), {
        metadata: { contentType: "image/jpeg" },
      });

      if (!isEKYCConfigured() || registration.ekycImageId === "pending") {
        return {
          matched: false,
          confidence: 0,
          error: "ekyc_unavailable",
        };
      }

      try {
        const ekycSession = await generateSession(process.env.EKYC_API_KEY!);

        const refImageFile = bucket.file(registration.referenceImagePath);
        const [refImageBuffer] = await refImageFile.download();
        const refBase64 = refImageBuffer.toString("base64");
        await uploadImageToEKYC(refBase64, ekycSession, "base_selfie");

        await uploadImageToEKYC(imageBase64, ekycSession, "selfie");

        const matchResult = await matchFaces(ekycSession);

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
      } catch (err: any) {
        return {
          matched: false,
          confidence: 0,
          error: `verification_failed: ${err.message}`,
        } as Partial<FaceVerificationResult>;
      }
    })
  );
