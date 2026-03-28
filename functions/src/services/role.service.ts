import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { requireAuth } from "../middleware/auth";

const db = admin.firestore();

/**
 * Allowed email domains for teacher role assignment.
 * Teachers must have linked a Microsoft account with one of these domains.
 */
const ALLOWED_TEACHER_DOMAINS = ["hust.edu.vn", "sis.hust.edu.vn"];

/**
 * assignTeacherRole — Server-side teacher role assignment.
 *
 * Validates that the user has linked a Microsoft account with an allowed
 * institutional email domain before granting teacher role.
 * This prevents any client from self-assigning teacher role.
 */
export const assignTeacherRole = functions.https.onCall(
  requireAuth(async (data, _context, verifiedUserId) => {
    const { userId } = data;

    // Ensure the requesting user is assigning to themselves
    if (userId !== verifiedUserId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Cannot assign role for another user"
      );
    }

    // Get user doc
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new functions.https.HttpsError("not-found", "User not found");
    }

    const userData = userSnap.data()!;

    // Check if already a teacher
    if (userData.role === "teacher") {
      return { success: true, message: "Already a teacher" };
    }

    // Verify Microsoft email is linked with an allowed domain
    const microsoftEmail: string | undefined = userData.microsoftEmail;
    if (!microsoftEmail) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Vui lòng liên kết tài khoản Microsoft (@hust.edu.vn) trước khi đăng ký vai trò giảng viên"
      );
    }

    const emailDomain = microsoftEmail.split("@")[1]?.toLowerCase();
    if (!emailDomain || !ALLOWED_TEACHER_DOMAINS.includes(emailDomain)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        `Email ${microsoftEmail} không thuộc tổ chức được phép. Cần email @hust.edu.vn`
      );
    }

    // All checks passed — assign teacher role via admin SDK (bypasses Firestore rules)
    await userRef.update({
      role: "teacher",
      updatedAt: Date.now(),
    });

    return { success: true };
  })
);
