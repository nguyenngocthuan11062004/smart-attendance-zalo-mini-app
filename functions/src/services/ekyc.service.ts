import * as functions from "firebase-functions";
import * as crypto from "crypto";
import type {
  EKYCUploadResponse,
  EKYCDecryptedUploadData,
  EKYCSanityCheckResponse,
  EKYCDecryptedSanityData,
  EKYCFaceMatchResponse,
  EKYCDecryptedFaceMatchData,
  EKYCOCRResponse,
  EKYCDecryptedOCRData,
} from "../types/ekyc";

// Production: https://ekyc-api.fiza.ai
// Development: https://dev-ekyc-api.fiza.ai
const EKYC_BASE_URL = process.env.EKYC_BASE_URL || "https://dev-ekyc-api.fiza.ai";

/**
 * Check if eKYC API credentials are configured.
 */
export function isEKYCConfigured(): boolean {
  return !!(process.env.EKYC_API_KEY && process.env.EKYC_PRIVATE_KEY);
}

function getConfig() {
  const apiKey = process.env.EKYC_API_KEY;
  const privateKey = process.env.EKYC_PRIVATE_KEY; // base64-encoded RSA private key (no PEM headers)
  const secretKey = process.env.EKYC_SECRET_KEY || "";
  if (!apiKey || !privateKey) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "eKYC API credentials not configured. Set EKYC_API_KEY and EKYC_PRIVATE_KEY."
    );
  }
  return { apiKey, privateKey, secretKey };
}

/**
 * Decrypt Zalo eKYC response `data` field using RSA private key.
 * RSA/ECB/PKCS1Padding, 2048-bit key.
 * Ciphertext is split into 256-byte blocks for decryption.
 */
function decryptEKYCResponse(encryptedBase64: string, privateKeyBase64: string): any {
  const privateKeyPem =
    "-----BEGIN PRIVATE KEY-----\n" +
    privateKeyBase64.match(/.{1,64}/g)!.join("\n") +
    "\n-----END PRIVATE KEY-----";

  const encryptedBuffer = Buffer.from(encryptedBase64, "base64");
  const blockSize = 256;
  const blocks: Buffer[] = [];

  for (let i = 0; i < encryptedBuffer.length; i += blockSize) {
    const block = encryptedBuffer.subarray(i, i + blockSize);
    const decrypted = crypto.privateDecrypt(
      { key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING },
      block
    );
    blocks.push(decrypted);
  }

  const plaintext = Buffer.concat(blocks).toString("utf-8");
  return JSON.parse(plaintext);
}

// --- Generate Session ---

export async function generateSession(apiKey: string): Promise<string> {
  const response = await fetch(`${EKYC_BASE_URL}/v1/api/ekyc-verify/session`, {
    method: "POST",
    headers: {
      api_key: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      consent_info: {
        uid: "attendance-app",
        timestamp: Date.now(),
        ip: "0.0.0.0",
      },
    }),
    signal: AbortSignal.timeout(15000),
  });

  const result = await response.json();
  if (result.code !== 0) {
    throw new functions.https.HttpsError("internal", `eKYC session failed: ${result.message}`);
  }

  const { apiKey: _ak, privateKey } = getConfig();
  const decrypted = decryptEKYCResponse(result.data, privateKey);
  return decrypted.session_id;
}

// --- Upload Image ---

/**
 * Upload a base64 image to eKYC server.
 * image_type: "selfie" for face photos, "base_selfie" for reference, "query_selfie" for verification
 */
export async function uploadImageToEKYC(
  imageBase64: string,
  sessionId: string,
  imageType: string = "selfie"
): Promise<number> {
  const { apiKey, privateKey } = getConfig();

  const imageBuffer = Buffer.from(imageBase64, "base64");

  const boundary = `----EKYCBoundary${Date.now()}`;
  const parts: Buffer[] = [];

  // session_id field
  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="session_id"\r\n\r\n${sessionId}\r\n`
  ));
  // image_type field
  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="image_type"\r\n\r\n${imageType}\r\n`
  ));
  // image_bytes field (binary)
  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="image_bytes"; filename="face.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
  ));
  parts.push(imageBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  const body = Buffer.concat(parts);

  const response = await fetch(`${EKYC_BASE_URL}/v1/api/ekyc-verify/upload`, {
    method: "POST",
    headers: {
      api_key: apiKey,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
    signal: AbortSignal.timeout(15000),
  });

  const result = (await response.json()) as EKYCUploadResponse;
  if (result.code !== 0) {
    throw new functions.https.HttpsError("internal", `eKYC upload failed: ${result.message}`);
  }

  const decrypted = decryptEKYCResponse(result.data, privateKey) as EKYCDecryptedUploadData;
  return decrypted.photo_id;
}

// --- Image Sanity Check ---

export async function checkImageSanity(
  sessionId: string
): Promise<{ isValid: boolean; issues: string[] }> {
  const { apiKey, privateKey } = getConfig();

  const response = await fetch(`${EKYC_BASE_URL}/v1/api/ekyc-verify/result/image-sanity-check`, {
    method: "POST",
    headers: {
      api_key: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ session_id: sessionId }),
    signal: AbortSignal.timeout(15000),
  });

  const result = (await response.json()) as EKYCSanityCheckResponse;
  if (result.code !== 0) {
    throw new functions.https.HttpsError("internal", `eKYC sanity check failed: ${result.message}`);
  }

  const decrypted = decryptEKYCResponse(result.data, privateKey) as EKYCDecryptedSanityData;
  return {
    isValid: decrypted.result.is_valid,
    issues: decrypted.result.issues || [],
  };
}

// --- ID Card OCR ---

export async function getOCRResult(
  sessionId: string
): Promise<EKYCDecryptedOCRData> {
  const { apiKey, privateKey } = getConfig();

  const response = await fetch(`${EKYC_BASE_URL}/v1/api/ekyc-verify/result/id-card-ocr`, {
    method: "POST",
    headers: {
      api_key: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ session_id: sessionId }),
    signal: AbortSignal.timeout(15000),
  });

  const result = (await response.json()) as EKYCOCRResponse;
  if (result.code !== 0) {
    throw new functions.https.HttpsError("internal", `eKYC OCR failed: ${result.message}`);
  }

  const decrypted = decryptEKYCResponse(result.data, privateKey) as EKYCDecryptedOCRData;
  return decrypted;
}

// --- Selfie Face Matching ---

/**
 * Compare selfie vs reference (base_selfie) in the same session.
 * Returns { matched, confidence (0-1) }
 */
export async function matchFaces(
  sessionId: string
): Promise<{ matched: boolean; confidence: number }> {
  const { apiKey, privateKey } = getConfig();

  const response = await fetch(`${EKYC_BASE_URL}/v1/api/ekyc-verify/result/selfie-face-matching`, {
    method: "POST",
    headers: {
      api_key: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ session_id: sessionId }),
    signal: AbortSignal.timeout(15000),
  });

  const result = (await response.json()) as EKYCFaceMatchResponse;
  if (result.code !== 0) {
    throw new functions.https.HttpsError("internal", `eKYC face matching failed: ${result.message}`);
  }

  const decrypted = decryptEKYCResponse(result.data, privateKey) as EKYCDecryptedFaceMatchData;
  return {
    matched: decrypted.issame,
    confidence: decrypted.prob,
  };
}
