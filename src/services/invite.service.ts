import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  limit,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { requestTeacherRole } from "@/services/auth.service";

const INVITES_COL = "teacher_invites";

export interface TeacherInviteDoc {
  code: string;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  usedBy: string | null;
  usedAt: number | null;
}

export interface InviteResult {
  success: boolean;
  error?: string;
}

/**
 * Verify if an invite code exists and is valid (not expired, not used).
 */
export async function verifyInviteCode(code: string): Promise<InviteResult> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) {
    return { success: false, error: "Vui lòng nhập mã mời" };
  }

  try {
    const q = query(
      collection(db, INVITES_COL),
      where("code", "==", trimmed),
      limit(1),
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      return { success: false, error: "Mã mời không hợp lệ" };
    }

    const inviteData = snap.docs[0].data() as TeacherInviteDoc;

    if (inviteData.usedBy) {
      return { success: false, error: "Mã mời đã được sử dụng" };
    }

    if (inviteData.expiresAt < Date.now()) {
      return { success: false, error: "Mã mời đã hết hạn" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Không thể kiểm tra mã mời. Vui lòng thử lại." };
  }
}

/**
 * Redeem an invite code: mark it as used and update user role to teacher.
 */
export async function redeemInviteCode(
  code: string,
  userId: string,
): Promise<InviteResult> {
  const trimmed = code.trim().toUpperCase();

  // Verify first
  const verification = await verifyInviteCode(trimmed);
  if (!verification.success) {
    return verification;
  }

  try {
    // Find the invite doc
    const q = query(
      collection(db, INVITES_COL),
      where("code", "==", trimmed),
      limit(1),
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      return { success: false, error: "Mã mời không hợp lệ" };
    }

    const inviteDocRef = doc(db, INVITES_COL, snap.docs[0].id);

    // Mark invite as used
    await setDoc(
      inviteDocRef,
      {
        usedBy: userId,
        usedAt: Date.now(),
      },
      { merge: true },
    );

    // Update user role to teacher
    await requestTeacherRole(userId);

    return { success: true };
  } catch {
    return { success: false, error: "Không thể sử dụng mã mời. Vui lòng thử lại." };
  }
}
