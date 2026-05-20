import QRCode from "qrcode";
import { createQRContent } from "@/utils/crypto";

export async function generateQRDataURL(content: string, size = 720): Promise<string> {
  return QRCode.toDataURL(content, {
    width: size,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}

export function createTeacherQR(sessionId: string, teacherId: string, secret: string): string {
  return createQRContent("teacher", sessionId, teacherId, secret);
}
