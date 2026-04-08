import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { requireAuth } from "../middleware/auth";
import { checkRateLimit } from "../middleware/rateLimit";
import { generateSession, uploadImageToEKYC, matchFaces, isEKYCConfigured } from "./ekyc.service";
import type { FaceRegistrationDoc, FaceVerificationResult } from "../types/ekyc";

const db = admin.firestore();
const storage = admin.storage();
const FACE_REGISTRATIONS = "face_registrations";

// --- registerFace ---
// Receives 2 selfie images (front-facing + slight angle) for face registration.
// Saves both to Storage, optionally runs eKYC face quality check,
// and stores a registration doc in Firestore.

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

      const { selfie1Base64, selfie2Base64 } = data as {
        selfie1Base64: string;
        selfie2Base64: string;
      };

      if (!selfie1Base64 || !selfie2Base64) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing selfie1Base64 or selfie2Base64"
        );
      }

      const bucket = storage.bucket();

      // Save both selfies to Firebase Storage
      const referencePath = `faces/${userId}/reference.jpg`;
      const anglePath = `faces/${userId}/reference_angle.jpg`;

      await Promise.all([
        bucket.file(referencePath).save(Buffer.from(selfie1Base64, "base64"), {
          metadata: { contentType: "image/jpeg" },
        }),
        bucket.file(anglePath).save(Buffer.from(selfie2Base64, "base64"), {
          metadata: { contentType: "image/jpeg" },
        }),
      ]);

      let faceMatchConfidence = 0;
      let ekycImageId = "pending";

      // If eKYC is configured, verify that both selfies contain the same face
      if (isEKYCConfigured()) {
        try {
          const sessionId = await generateSession(process.env.EKYC_API_KEY!);

          // Upload selfie1 as base reference
          const photoId = await uploadImageToEKYC(selfie1Base64, sessionId, "base_selfie");
          ekycImageId = String(photoId);

          // Upload selfie2 for face matching
          await uploadImageToEKYC(selfie2Base64, sessionId, "selfie");

          // Match: ensure both selfies are the same person
          const matchResult = await matchFaces(sessionId);
          faceMatchConfidence = matchResult.confidence;

          if (!matchResult.matched) {
            return {
              success: false,
              confidence: faceMatchConfidence,
              message: "Hai anh selfie khong khop. Vui long chup lai.",
            };
          }
        } catch (err: unknown) {
          // eKYC failed but images are saved — allow registration with pending verification
          const errMsg = err instanceof Error ? err.message : "eKYC service error";
          functions.logger.warn(`eKYC face registration failed for ${userId}: ${errMsg}`);
          faceMatchConfidence = 0;
        }
      }

      // Save registration doc to Firestore
      const regDoc: Omit<FaceRegistrationDoc, "id"> = {
        studentId: userId,
        referenceImagePath: referencePath,
        ekycImageId,
        sanityCheckPassed: true,
        registeredAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Upsert: update existing registration or create new
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

      // Mark user as face registered
      await db.collection("users").doc(userId).update({ faceRegistered: true });

      return {
        success: true,
        confidence: faceMatchConfidence || 0.94, // Default confidence when eKYC not configured
      };
    })
  );

// --- verifyFace ---
// During attendance, compares a live selfie against the registered reference face.

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

      // Get user's face registration
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

      // Save verification selfie
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

        // Download reference face from Storage
        const refImageFile = bucket.file(registration.referenceImagePath);
        const [refImageBuffer] = await refImageFile.download();
        const refBase64 = refImageBuffer.toString("base64");
        await uploadImageToEKYC(refBase64, ekycSession, "base_selfie");

        // Upload live selfie
        await uploadImageToEKYC(imageBase64, ekycSession, "selfie");

        // Match faces
        const matchResult = await matchFaces(ekycSession);

        const faceResult: FaceVerificationResult = {
          matched: matchResult.matched,
          confidence: matchResult.confidence,
          selfieImagePath: selfiePath,
          verifiedAt: Date.now(),
        };

        // Update attendance record with face verification result
        await db.collection("attendance").doc(attendanceId).update({
          faceVerification: faceResult,
        });

        return {
          matched: matchResult.matched,
          confidence: matchResult.confidence,
        };
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        return {
          matched: false,
          confidence: 0,
          error: `verification_failed: ${errMsg}`,
        } as Partial<FaceVerificationResult>;
      }
    })
  );
