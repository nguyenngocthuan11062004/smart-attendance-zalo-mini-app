import * as functions from "firebase-functions";
import * as crypto from "crypto";
import type {
  EKYCUploadResponse,
  EKYCDecryptedUploadData,
  EKYCSanityCheckResponse,
  EKYCDecryptedSanityData,
  EKYCFaceMatchResponse,
  EKYCDecryptedFaceMatchData,
} from "../types/ekyc";

const EKYC_BASE_URL = "https://graph.zalo.me/v1/api/ekyc-verify";

function getConfig() {
  const config = functions.config();
  const apiKey = config.ekyc?.api_key;
  const privateKey = config.ekyc?.private_key; // base64-encoded PEM
  if (!apiKey || !privateKey) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "eKYC API credentials not configured"
    );
  }
  return { apiKey, privateKey };
}

/**
 * Decrypt Zalo eKYC response data using RSA private key.
 * Zalo encrypts the `data` field with the partner's public key;
 * we decrypt with the corresponding private key.
 */
function decryptEKYCResponse(encryptedData: string, privateKeyBase64: string): any {
  const privateKeyPem = Buffer.from(privateKeyBase64, "base64").toString("utf-8");
  const decrypted = crypto.privateDecrypt(
    {
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    Buffer.from(encryptedData, "base64")
  );
  return JSON.parse(decrypted.toString("utf-8"));
}

/**
 * Upload a base64 image to Zalo eKYC server.
 * Returns the eKYC image ID for subsequent operations.
 */
export async function uploadImageToEKYC(imageBase64: string): Promise<string> {
  const { apiKey, privateKey } = getConfig();

  // Convert base64 to binary buffer
  const imageBuffer = Buffer.from(imageBase64, "base64");

  // Build multipart form data manually
  const boundary = `----EKYCBoundary${Date.now()}`;
  const bodyParts = [
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="file"; filename="face.jpg"\r\n`,
    `Content-Type: image/jpeg\r\n\r\n`,
  ];
  const bodyStart = Buffer.from(bodyParts.join(""));
  const bodyEnd = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([bodyStart, imageBuffer, bodyEnd]);

  const response = await fetch(`${EKYC_BASE_URL}/upload`, {
    method: "POST",
    headers: {
      api_key: apiKey,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
    signal: AbortSignal.timeout(15000),
  });

  const result = (await response.json()) as EKYCUploadResponse;
  if (result.error !== 0) {
    throw new functions.https.HttpsError(
      "internal",
      `eKYC upload failed: ${result.message}`
    );
  }

  const decrypted = decryptEKYCResponse(result.data, privateKey) as EKYCDecryptedUploadData;
  return decrypted.img;
}

/**
 * Run image sanity check (quality, face detected, etc.)
 */
export async function checkImageSanity(
  ekycImageId: string
): Promise<{ isValid: boolean; issues: string[] }> {
  const { apiKey, privateKey } = getConfig();

  const response = await fetch(`${EKYC_BASE_URL}/result/image-sanity-check`, {
    method: "POST",
    headers: {
      api_key: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ img: ekycImageId }),
    signal: AbortSignal.timeout(15000),
  });

  const result = (await response.json()) as EKYCSanityCheckResponse;
  if (result.error !== 0) {
    throw new functions.https.HttpsError(
      "internal",
      `eKYC sanity check failed: ${result.message}`
    );
  }

  const decrypted = decryptEKYCResponse(result.data, privateKey) as EKYCDecryptedSanityData;
  return {
    isValid: decrypted.result.is_valid,
    issues: decrypted.result.issues || [],
  };
}

/**
 * Compare two face images (selfie vs reference).
 * Returns match result and confidence score (0.0 - 1.0).
 */
export async function matchFaces(
  selfieImageId: string,
  referenceImageId: string
): Promise<{ matched: boolean; confidence: number }> {
  const { apiKey, privateKey } = getConfig();

  const response = await fetch(`${EKYC_BASE_URL}/result/selfie-face-matching`, {
    method: "POST",
    headers: {
      api_key: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      img_front: referenceImageId,
      img_back: selfieImageId,
    }),
    signal: AbortSignal.timeout(15000),
  });

  const result = (await response.json()) as EKYCFaceMatchResponse;
  if (result.error !== 0) {
    throw new functions.https.HttpsError(
      "internal",
      `eKYC face matching failed: ${result.message}`
    );
  }

  const decrypted = decryptEKYCResponse(result.data, privateKey) as EKYCDecryptedFaceMatchData;
  return {
    matched: decrypted.result.match === "true",
    confidence: decrypted.result.score / 100, // Normalize to 0.0 - 1.0
  };
}
