import { useState, useEffect, useRef } from "react";

export function useCountdown(totalSeconds: number, onExpire?: () => void) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const timerRef = useRef<number>();

  useEffect(() => {
    setSecondsLeft(totalSeconds);
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          onExpire?.();
          return totalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [totalSeconds]);

  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;

  return { secondsLeft, progress };
}
