import { vibrate } from "zmp-sdk";

type HapticIntensity = "tap" | "success" | "error";

const DURATION_MS: Record<HapticIntensity, number> = {
  tap: 20,
  success: 40,
  error: 80,
};

export function haptic(intensity: HapticIntensity = "tap"): void {
  const ms = DURATION_MS[intensity];
  vibrate({ type: "oneShot", milliseconds: ms }).catch(() => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try { navigator.vibrate(ms); } catch { /* noop */ }
    }
  });
}
