import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import type { PairingTokenDoc } from "@/types";

const PAIRING_COL = "pairing_tokens";
export const PAIRING_QR_PREFIX = "inhust-pair://";

export function parsePairingQRContent(raw: string): string | null {
  if (!raw.startsWith(PAIRING_QR_PREFIX)) return null;
  const token = raw.slice(PAIRING_QR_PREFIX.length).trim();
  return /^[0-9a-f]{32}$/.test(token) ? token : null;
}

export interface ClaimResult {
  ok: boolean;
  error?: "not_found" | "expired" | "already_used" | "unknown";
}

export async function claimPairingToken(
  token: string,
  sessionId: string,
  classId: string,
  className: string,
  teacherId: string
): Promise<ClaimResult> {
  const ref = doc(db, PAIRING_COL, token);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, error: "not_found" };

  const data = snap.data() as PairingTokenDoc;
  if (data.status !== "pending") return { ok: false, error: "already_used" };
  if (Date.now() > data.expiresAt) return { ok: false, error: "expired" };

  try {
    await updateDoc(ref, {
      status: "paired",
      sessionId,
      classId,
      className,
      teacherId,
      pairedAt: Date.now(),
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "unknown" };
  }
}
