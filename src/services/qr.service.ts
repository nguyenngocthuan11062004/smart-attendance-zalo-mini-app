import QRCode from "qrcode";
import { createQRContent } from "@/utils/crypto";
import { parseQRContent } from "@/utils/validation";
import type { QRPayload } from "@/types";

export async function generateQRDataURL(content: string): Promise<string> {
  return QRCode.toDataURL(content, {
    width: 280,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}

export function createTeacherQR(sessionId: string, teacherId: string, secret: string): string {
  return createQRContent("teacher", sessionId, teacherId, secret);
}

export function createPeerQR(sessionId: string, studentId: string, secret: string): string {
  return createQRContent("peer", sessionId, studentId, secret);
}

export function parseScannedQR(raw: string): QRPayload | null {
  return parseQRContent(raw);
}
