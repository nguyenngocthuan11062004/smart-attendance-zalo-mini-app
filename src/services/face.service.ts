import { callFunction } from "./api";
import type { FaceVerificationResult } from "@/types";

interface RegisterFaceResponse {
  success: boolean;
  sanityPassed: boolean;
  issues?: string[];
}

interface VerifyFaceResponse {
  matched: boolean;
  confidence: number;
  error?: string;
}

const isDevMode = location.hostname === "localhost" || location.hostname === "127.0.0.1";

const registerFaceFn = callFunction<{ imageBase64: string }, RegisterFaceResponse>("registerFace");
const verifyFaceFn = callFunction<{ imageBase64: string; sessionId: string; attendanceId: string }, VerifyFaceResponse>("verifyFace");

export async function registerFace(imageBase64: string): Promise<RegisterFaceResponse> {
  if (isDevMode) {
    await new Promise((r) => setTimeout(r, 1500));
    return { success: true, sanityPassed: true };
  }
  const result = await registerFaceFn({ imageBase64 });
  return result.data;
}

export async function verifyFace(
  imageBase64: string,
  sessionId: string,
  attendanceId: string
): Promise<VerifyFaceResponse> {
  if (isDevMode) {
    await new Promise((r) => setTimeout(r, 1500));
    return { matched: true, confidence: 0.92 };
  }
  const result = await verifyFaceFn({ imageBase64, sessionId, attendanceId });
  return result.data;
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
