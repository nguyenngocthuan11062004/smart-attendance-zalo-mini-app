/**
 * Email verification service for HUST students.
 * Sends OTP to @sis.hust.edu.vn email via EmailJS (client-side, no server needed).
 * Free tier: 200 emails/month.
 *
 * Setup: Tạo tài khoản EmailJS → Service (Gmail/Outlook) → Template → lấy keys.
 * Lưu vào .env: VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, VITE_EMAILJS_PUBLIC_KEY
 */
import emailjs from "@emailjs/browser";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { isValidHUSTEmail, extractMSSV } from "@/utils/sanitize";

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || "";
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "";
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "";

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 phút
const VERIFIED_COLLECTION = "verified_students";

// In-memory OTP store (client-side only)
let pendingOTP: { code: string; email: string; mssv: string; expiresAt: number } | null = null;

/**
 * Generate 6-digit OTP
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Check if EmailJS is configured
 */
export function isEmailVerifyConfigured(): boolean {
  return !!(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);
}

/**
 * Check if student is already verified (Zalo ID linked to MSSV)
 */
export async function isStudentVerified(userId: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, VERIFIED_COLLECTION, userId));
    return snap.exists() && snap.data()?.verified === true;
  } catch {
    return false;
  }
}

/**
 * Send OTP to HUST email
 */
export async function sendOTP(
  email: string,
  mssv: string
): Promise<{ success: boolean; message: string }> {
  // Validate email
  if (!isValidHUSTEmail(email)) {
    return { success: false, message: "Email phải có đuôi @sis.hust.edu.vn" };
  }

  // Validate MSSV matches email
  const extractedMSSV = extractMSSV(email);
  if (extractedMSSV && extractedMSSV !== mssv) {
    return { success: false, message: "MSSV không khớp với email" };
  }

  if (!isEmailVerifyConfigured()) {
    // Dev mode: skip email, auto-verify
    pendingOTP = { code: "123456", email, mssv, expiresAt: Date.now() + OTP_EXPIRY_MS };
    return { success: true, message: "Chế độ phát triển: mã OTP là 123456" };
  }

  const otp = generateOTP();
  pendingOTP = { code: otp, email, mssv, expiresAt: Date.now() + OTP_EXPIRY_MS };

  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
      to_email: email,
      otp_code: otp,
      student_name: mssv,
      app_name: "inHUST Attendance",
    }, PUBLIC_KEY);

    return { success: true, message: `Đã gửi mã xác minh đến ${email}` };
  } catch {
    pendingOTP = null;
    return { success: false, message: "Không thể gửi email. Vui lòng thử lại sau." };
  }
}

/**
 * Verify OTP and link Zalo ID to MSSV permanently
 */
export async function verifyOTP(
  code: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  if (!pendingOTP) {
    return { success: false, message: "Chưa gửi mã xác minh. Vui lòng gửi lại." };
  }

  if (Date.now() > pendingOTP.expiresAt) {
    pendingOTP = null;
    return { success: false, message: "Mã xác minh đã hết hạn. Vui lòng gửi lại." };
  }

  if (code !== pendingOTP.code) {
    return { success: false, message: "Mã xác minh không đúng." };
  }

  // Save verification to Firestore
  try {
    await setDoc(doc(db, VERIFIED_COLLECTION, userId), {
      userId,
      mssv: pendingOTP.mssv,
      email: pendingOTP.email,
      verified: true,
      verifiedAt: Date.now(),
    });

    // Update user doc
    await setDoc(doc(db, "users", userId), {
      email: pendingOTP.email,
      hustVerified: true,
      hustStudentId: pendingOTP.mssv,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch {
    return { success: false, message: "Lỗi lưu trữ. Vui lòng thử lại." };
  }

  pendingOTP = null;
  return { success: true, message: "Xác minh thành công!" };
}
