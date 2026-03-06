import { useCallback, useState } from "react";
import { scanQRCode, requestCameraPermission } from "zmp-sdk/apis";
import { parseScannedQR } from "@/services/qr.service";
import type { QRPayload } from "@/types";

export function useQRScanner() {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (): Promise<QRPayload | null> => {
    try {
      setScanning(true);
      setError(null);

      // Xin quyền camera trước khi quét
      try {
        await requestCameraPermission({});
      } catch {
        setError("Vui lòng cấp quyền camera để quét QR");
        return null;
      }

      const { content } = await scanQRCode({});
      if (!content) {
        setError("Không đọc được QR");
        return null;
      }
      const payload = parseScannedQR(content);
      if (!payload) {
        setError("QR không hợp lệ");
        return null;
      }
      return payload;
    } catch (err: any) {
      if (err.code === -201 || err.message?.includes("cancel")) {
        // User đóng scanner, không phải lỗi
        return null;
      }
      setError(err.message || "Lỗi quét QR");
      return null;
    } finally {
      setScanning(false);
    }
  }, []);

  return { scan, scanning, error, clearError: () => setError(null) };
}
