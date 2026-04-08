import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import type { FaceVerificationResult } from "@/types";
import { storageGetItem } from "@/utils/storage";

/**
 * Lazy-load face-ai.service.ts (which imports @vladmandic/face-api ~6.4MB).
 * This ensures face-api models are only fetched when the user actually
 * enters Face Register or Attendance Step 2 — NOT at app startup.
 */
async function getFaceAI() {
  return import("./face-ai.service");
}

interface RegisterFaceResponse {
  success: boolean;
  confidence?: number;
  message?: string;
}

interface VerifyFaceResponse {
  matched: boolean;
  confidence: number;
  error?: string;
}

const FACE_COLLECTION = "face_registrations";

/**
 * Register face: detect face in 2 selfies, verify same person,
 * store descriptor in Firestore.
 */
export async function registerFace(
  selfie1Base64: string,
  selfie2Base64: string
): Promise<RegisterFaceResponse> {
  const { detectFace, compareFaces, serializeDescriptor } = await getFaceAI();

  // Detect face in selfie 1
  const face1 = await detectFace(selfie1Base64);
  if (!face1) {
    return { success: false, message: "Không phát hiện khuôn mặt trong ảnh thứ nhất. Hãy chụp lại." };
  }

  // Detect face in selfie 2
  const face2 = await detectFace(selfie2Base64);
  if (!face2) {
    return { success: false, message: "Không phát hiện khuôn mặt trong ảnh thứ hai. Hãy chụp lại." };
  }

  // Compare: ensure both selfies are the same person
  const comparison = compareFaces(face1.descriptor, face2.descriptor);
  if (!comparison.matched) {
    return {
      success: false,
      confidence: comparison.confidence,
      message: "Hai ảnh không khớp khuôn mặt. Vui lòng chụp lại.",
    };
  }

  // Store descriptor in Firestore (use selfie1 as reference)
  const userId = await getCurrentUserId();
  if (userId) {
    await setDoc(doc(db, FACE_COLLECTION, userId), {
      studentId: userId,
      descriptor: serializeDescriptor(face1.descriptor),
      confidence: face1.confidence,
      registeredAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  return {
    success: true,
    confidence: Math.min(face1.confidence, comparison.confidence),
  };
}

/**
 * Verify face during attendance: compare live selfie with stored descriptor.
 */
export async function verifyFace(
  imageBase64: string,
  _sessionId: string,
  _attendanceId: string
): Promise<VerifyFaceResponse> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { matched: false, confidence: 0, error: "no_user" };
  }

  // Get stored descriptor from Firestore
  const regDoc = await getDoc(doc(db, FACE_COLLECTION, userId));
  if (!regDoc.exists()) {
    return { matched: false, confidence: 0, error: "no_registration" };
  }

  const storedData = regDoc.data();
  if (!storedData?.descriptor) {
    return { matched: false, confidence: 0, error: "no_descriptor" };
  }

  const { detectFace, compareFaces, deserializeDescriptor } = await getFaceAI();

  const storedDescriptor = deserializeDescriptor(storedData.descriptor);

  // Detect face in live image
  const liveFace = await detectFace(imageBase64);
  if (!liveFace) {
    return { matched: false, confidence: 0, error: "no_face_detected" };
  }

  // Compare
  const result = compareFaces(storedDescriptor, liveFace.descriptor);

  return {
    matched: result.matched,
    confidence: result.confidence,
  };
}

export function buildSkippedResult(): FaceVerificationResult {
  return {
    matched: false,
    confidence: 0,
    selfieImagePath: "",
    verifiedAt: Date.now(),
    skipped: true,
  };
}

// --- Helper ---

async function getCurrentUserId(): Promise<string | null> {
  try {
    const stored = await storageGetItem("user_doc");
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.id || null;
    }
  } catch { /* ignore */ }
  return null;
}
