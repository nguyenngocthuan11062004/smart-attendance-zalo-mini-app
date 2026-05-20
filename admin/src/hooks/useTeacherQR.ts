import { useEffect, useRef, useState } from "react";
import { createTeacherQR, generateQRDataURL } from "@/services/qr.service";

interface Options {
  sessionId: string;
  teacherId: string;
  secret: string;
  refreshIntervalMs: number;
  /** Wall-clock anchor — dùng để đồng bộ countdown giữa Mini App và Web. */
  anchor: number;
  size?: number;
}

/**
 * Sinh QR code cho GV, đồng bộ theo anchor wall-clock.
 *
 * Mọi instance dùng cùng (anchor, refreshIntervalMs) sẽ cùng:
 *   - Generate QR mới tại các mốc t = anchor + n*period
 *   - Hiển thị `secondsLeft` giống nhau tại mọi thời điểm
 *
 * → Mini App + Web hiển thị countdown giống hệt nhau.
 */
export function useTeacherQR(options: Options | null) {
  const [qrDataURL, setQrDataURL] = useState<string>("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const lastPeriodRef = useRef<number>(-1);

  const refreshSeconds = Math.floor((options?.refreshIntervalMs ?? 30000) / 1000);

  useEffect(() => {
    if (!options) return;
    let active = true;
    lastPeriodRef.current = -1;

    const tick = async () => {
      if (!active || !options) return;
      const { sessionId, teacherId, secret, refreshIntervalMs, anchor, size } = options;
      const now = Date.now();
      const elapsed = Math.max(0, now - anchor);
      const periodIndex = Math.floor(elapsed / refreshIntervalMs);
      const periodStart = anchor + periodIndex * refreshIntervalMs;
      const remainingMs = refreshIntervalMs - (now - periodStart);

      setSecondsLeft(Math.max(1, Math.ceil(remainingMs / 1000)));

      if (periodIndex !== lastPeriodRef.current) {
        lastPeriodRef.current = periodIndex;
        const content = createTeacherQR(sessionId, teacherId, secret);
        const dataURL = await generateQRDataURL(content, size ?? 720);
        if (active) setQrDataURL(dataURL);
      }
    };

    tick();
    const id = window.setInterval(tick, 500);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [
    options?.sessionId,
    options?.teacherId,
    options?.secret,
    options?.refreshIntervalMs,
    options?.anchor,
    options?.size,
  ]);

  return { qrDataURL, secondsLeft, refreshSeconds };
}
