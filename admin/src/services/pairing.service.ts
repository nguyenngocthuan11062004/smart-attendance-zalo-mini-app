import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import type { PairingTokenDoc } from "@/types";

const PAIRING_COL = "pairing_tokens";
// Token sống lâu (12h) — máy chiếu tạo 1 mã/lần mở, KHÔNG làm mới mỗi 60s
// (tránh rò rỉ token tích tụ vô hạn).
const PAIRING_TTL_MS = 12 * 60 * 60 * 1000;

function randomToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createPairingToken(): Promise<PairingTokenDoc> {
  const token = randomToken();
  const now = Date.now();
  const data: PairingTokenDoc = {
    token,
    status: "pending",
    sessionId: null,
    classId: null,
    className: null,
    teacherId: null,
    createdAt: now,
    expiresAt: now + PAIRING_TTL_MS,
  };
  await setDoc(doc(collection(db, PAIRING_COL), token), data);
  return data;
}

export async function deletePairingToken(token: string): Promise<void> {
  try {
    await deleteDoc(doc(db, PAIRING_COL, token));
  } catch {
    // ignore — token có thể đã bị xoá
  }
}

export function subscribePairingToken(
  token: string,
  callback: (doc: PairingTokenDoc | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, PAIRING_COL, token), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback(snap.data() as PairingTokenDoc);
  });
}

export async function getPairingToken(token: string): Promise<PairingTokenDoc | null> {
  const snap = await getDoc(doc(db, PAIRING_COL, token));
  if (!snap.exists()) return null;
  return snap.data() as PairingTokenDoc;
}

export const PAIRING_QR_PREFIX = "inhust-pair://";

export function buildPairingQRContent(token: string): string {
  return `${PAIRING_QR_PREFIX}${token}`;
}

export function parsePairingQRContent(raw: string): string | null {
  if (!raw.startsWith(PAIRING_QR_PREFIX)) return null;
  const token = raw.slice(PAIRING_QR_PREFIX.length).trim();
  return /^[0-9a-f]{32}$/.test(token) ? token : null;
}
