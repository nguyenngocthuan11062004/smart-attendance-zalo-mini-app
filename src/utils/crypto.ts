import CryptoJS from "crypto-js";

export function generateNonce(): string {
  return CryptoJS.lib.WordArray.random(16).toString();
}

export function signPayload(
  data: { type: string; sessionId: string; userId: string; timestamp: number; nonce: string },
  secret: string
): string {
  const message = `${data.type}:${data.sessionId}:${data.userId}:${data.timestamp}:${data.nonce}`;
  return CryptoJS.HmacSHA256(message, secret).toString();
}

export function verifySignature(
  data: { type: string; sessionId: string; userId: string; timestamp: number; nonce: string },
  signature: string,
  secret: string
): boolean {
  const expected = signPayload(data, secret);
  return expected === signature;
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

  const payload = { type, sessionId, userId, timestamp, nonce, signature };
  return JSON.stringify(payload);
}
