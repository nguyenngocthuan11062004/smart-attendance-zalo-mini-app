import { useCallback, useState } from "react";
import { scanQRCode } from "zmp-sdk";
import { parseScannedQR } from "@/services/qr.service";
import type { QRPayload } from "@/types";

export function useQRScanner() {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (): Promise<QRPayload | null> => {
    try {
      setScanning(true);
      setError(null);
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
      setError(err.message || "Lỗi quét QR");
      return null;
    } finally {
      setScanning(false);
    }
  }, []);

  return { scan, scanning, error };
}
