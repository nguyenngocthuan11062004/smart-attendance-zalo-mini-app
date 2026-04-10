import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "@/config/firebase";

const INVITES_COL = "teacher_invites";

export interface TeacherInviteDoc {
  id: string;
  code: string;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  usedBy: string | null;
  usedAt: number | null;
}

/**
 * Generate a random uppercase alphanumeric code (8 chars).
 */
export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // exclude confusing chars: I, O, 0, 1
  const codeChars: string[] = [];
  for (let i = 0; i < 8; i++) {
    codeChars.push(chars.charAt(Math.floor(Math.random() * chars.length)));
  }
  return codeChars.join("");
}

/**
 * Create a new teacher invite code in Firestore.
 */
export async function createInviteCode(
  createdBy: string,
  expiryDays: number = 7,
): Promise<TeacherInviteDoc> {
  const code = generateInviteCode();
  const now = Date.now();
  const docId = `invite_${code}_${now}`;

  const inviteData = {
    code,
    createdBy,
    createdAt: now,
    expiresAt: now + expiryDays * 24 * 60 * 60 * 1000,
    usedBy: null,
    usedAt: null,
  };

  await setDoc(doc(db, INVITES_COL, docId), inviteData);

  return { id: docId, ...inviteData };
}

/**
 * Fetch all invite codes, ordered by createdAt desc.
 */
export async function getInviteCodes(): Promise<TeacherInviteDoc[]> {
  const q = query(collection(db, INVITES_COL), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TeacherInviteDoc);
}

/**
 * Get status label for an invite code.
 */
export function getInviteStatus(
  invite: TeacherInviteDoc,
): "available" | "used" | "expired" {
  if (invite.usedBy) return "used";
  if (invite.expiresAt < Date.now()) return "expired";
  return "available";
}
