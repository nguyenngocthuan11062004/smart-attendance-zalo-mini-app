import { useEffect, useRef, useState } from "react";
import { generateQRDataURL, createTeacherQR, createPeerQR } from "@/services/qr.service";

interface UseQRGeneratorOptions {
  type: "teacher" | "peer";
  sessionId: string;
  userId: string;
  secret: string;
  refreshIntervalMs?: number;
  /**
   * Wall-clock anchor (Date.now() millis) — bắt buộc dùng để đồng bộ countdown
   * giữa Mini App và Web (PresentPage). Truyền `session.startedAt`.
   *
   * Nếu omit → fallback về Date.now() khi mount (đếm độc lập, không sync).
   */
  anchor?: number;
}

export function useQRGenerator(options: UseQRGeneratorOptions | null) {
  const [qrDataURL, setQrDataURL] = useState<string>("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const lastPeriodRef = useRef<number>(-1);
  const fallbackAnchorRef = useRef<number>(Date.now());

  const refreshInterval = options?.refreshIntervalMs ?? 30000;
  const refreshSeconds = Math.floor(refreshInterval / 1000);

  useEffect(() => {
    if (!options) return;
    let active = true;
    lastPeriodRef.current = -1;
    fallbackAnchorRef.current = Date.now();

    const tick = async () => {
      if (!active || !options) return;
      const { type, sessionId, userId, secret, anchor } = options;
      const useAnchor = anchor ?? fallbackAnchorRef.current;
      const now = Date.now();
      const elapsed = Math.max(0, now - useAnchor);
      const periodIndex = Math.floor(elapsed / refreshInterval);
      const periodStart = useAnchor + periodIndex * refreshInterval;
      const remainingMs = refreshInterval - (now - periodStart);

      setSecondsLeft(Math.max(1, Math.ceil(remainingMs / 1000)));

      if (periodIndex !== lastPeriodRef.current) {
        lastPeriodRef.current = periodIndex;
        const content =
          type === "teacher"
            ? createTeacherQR(sessionId, userId, secret)
            : createPeerQR(sessionId, userId, secret);
        const dataURL = await generateQRDataURL(content);
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
    options?.type,
    options?.sessionId,
    options?.userId,
    options?.secret,
    options?.anchor,
    refreshInterval,
  ]);

  return { qrDataURL, secondsLeft, refreshSeconds };
}
