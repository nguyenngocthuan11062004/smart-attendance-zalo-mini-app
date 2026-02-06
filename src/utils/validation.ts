import type { QRPayload, AttendanceDoc } from "@/types";
import { verifySignature } from "./crypto";

const QR_EXPIRY_MS = 60_000; // QR valid for 60 seconds

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateTeacherQR(
  payload: QRPayload,
  secret: string
): ValidationResult {
  if (payload.type !== "teacher") {
    return { valid: false, error: "QR không phải của giảng viên" };
  }
  if (!verifySignature(payload, payload.signature, secret)) {
    return { valid: false, error: "Chữ ký không hợp lệ" };
  }
  if (Date.now() - payload.timestamp > QR_EXPIRY_MS) {
    return { valid: false, error: "QR đã hết hạn" };
  }
  return { valid: true };
}

export function validatePeerQR(
  payload: QRPayload,
  currentUserId: string,
  existingVerifications: AttendanceDoc["peerVerifications"],
  secret: string
): ValidationResult {
  if (payload.type !== "peer") {
    return { valid: false, error: "QR không phải của sinh viên" };
  }
  if (payload.userId === currentUserId) {
    return { valid: false, error: "Không thể quét QR của chính mình" };
  }
  if (existingVerifications.some((v) => v.peerId === payload.userId)) {
    return { valid: false, error: "Đã xác minh sinh viên này rồi" };
  }
  if (!verifySignature(payload, payload.signature, secret)) {
    return { valid: false, error: "Chữ ký không hợp lệ" };
  }
  if (Date.now() - payload.timestamp > QR_EXPIRY_MS) {
    return { valid: false, error: "QR đã hết hạn" };
  }
  return { valid: true };
}

export function parseQRContent(content: string): QRPayload | null {
  try {
    const parsed = JSON.parse(content);
    if (
      parsed &&
      typeof parsed.type === "string" &&
      typeof parsed.sessionId === "string" &&
      typeof parsed.userId === "string" &&
      typeof parsed.timestamp === "number" &&
      typeof parsed.nonce === "string" &&
      typeof parsed.signature === "string"
    ) {
      return parsed as QRPayload;
    }
    return null;
  } catch {
    return null;
  }
}
