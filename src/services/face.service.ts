import { callWithFallback } from "@/utils/cloudFallback";
import { getAccessToken } from "@/services/auth.service";
import type { FaceVerificationResult } from "@/types";

interface RegisterCCCDResponse {
  success: boolean;
  step?: string;
  ocrData?: Record<string, any>;
  faceMatched?: boolean;
  faceMatchConfidence?: number;
  issues?: string[];
  message?: string;
}

interface VerifyFaceResponse {
  matched: boolean;
  confidence: number;
  error?: string;
}

const isDevMode = location.hostname === "localhost" || location.hostname === "127.0.0.1";

export async function registerCCCD(
  frontBase64: string,
  backBase64: string,
  selfieBase64: string
): Promise<RegisterCCCDResponse> {
  if (isDevMode) {
    await new Promise((r) => setTimeout(r, 2000));
    return {
      success: true,
      ocrData: {
        id_number: "001234567890",
        full_name: "NGUYEN VAN A",
        date_of_birth: "01/01/2002",
        gender: "Nam",
        place_of_residence: "Ha Noi",
      },
      faceMatched: true,
      faceMatchConfidence: 0.95,
    };
  }

  const accessToken = await getAccessToken();

  return callWithFallback(
    "registerCCCD",
    { frontBase64, backBase64, selfieBase64, accessToken },
    async () => {
      return {
        success: false,
        step: "cloud_unavailable",
        message: "Dich vu tam thoi khong kha dung",
      };
    }
  );
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

  const accessToken = await getAccessToken();

  return callWithFallback(
    "verifyFace",
    { imageBase64, sessionId, attendanceId, accessToken },
    async () => {
      return {
        matched: false,
        confidence: 0,
        error: "Dich vu xac minh khuon mat tam thoi khong kha dung.",
      };
    }
  );
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
