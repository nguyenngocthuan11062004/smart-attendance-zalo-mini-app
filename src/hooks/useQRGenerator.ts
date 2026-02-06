import { useState, useEffect, useCallback, useRef } from "react";
import { generateQRDataURL, createTeacherQR, createPeerQR } from "@/services/qr.service";

interface UseQRGeneratorOptions {
  type: "teacher" | "peer";
  sessionId: string;
  userId: string;
  secret: string;
  refreshIntervalMs?: number;
}

export function useQRGenerator(options: UseQRGeneratorOptions | null) {
  const [qrDataURL, setQrDataURL] = useState<string>("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef<number>();
  const countdownRef = useRef<number>();

  const refreshInterval = options?.refreshIntervalMs ?? 15000;
  const refreshSeconds = Math.floor(refreshInterval / 1000);

  const generateQR = useCallback(async () => {
    if (!options) return;
    const { type, sessionId, userId, secret } = options;
    const content =
      type === "teacher"
        ? createTeacherQR(sessionId, userId, secret)
        : createPeerQR(sessionId, userId, secret);
    const dataURL = await generateQRDataURL(content);
    setQrDataURL(dataURL);
    setSecondsLeft(refreshSeconds);
  }, [options?.type, options?.sessionId, options?.userId, options?.secret, refreshSeconds]);

  useEffect(() => {
    if (!options) return;

    generateQR();
    intervalRef.current = window.setInterval(generateQR, refreshInterval);

    countdownRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : refreshSeconds));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [generateQR, refreshInterval, refreshSeconds, options?.sessionId]);

  return { qrDataURL, secondsLeft, refreshSeconds };
}
