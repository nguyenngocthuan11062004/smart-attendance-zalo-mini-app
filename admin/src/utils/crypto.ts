import CryptoJS from "crypto-js";

export function generateNonce(): string {
  return CryptoJS.lib.WordArray.random(16).toString();
}

interface SignableData {
  type: string;
  sessionId: string;
  userId: string;
  timestamp: number;
  nonce: string;
}

export function signPayload(data: SignableData, secret: string): string {
  const message = `${data.type}:${data.sessionId}:${data.userId}:${data.timestamp}:${data.nonce}`;
  return CryptoJS.HmacSHA256(message, secret).toString();
}

export function createQRContent(
  type: "teacher" | "peer",
  sessionId: string,
  userId: string,
  secret: string
): string {
  const timestamp = Date.now();
  const nonce = generateNonce();
  const signature = signPayload({ type, sessionId, userId, timestamp, nonce }, secret);
  return JSON.stringify({ type, sessionId, userId, timestamp, nonce, signature });
}
