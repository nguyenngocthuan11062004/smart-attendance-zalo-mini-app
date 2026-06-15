import React, { useEffect, useState } from "react";
import { Page, Spinner } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAtomValue, useSetAtom } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { globalLoadingAtom } from "@/store/ui";
import { isValidMSSV, isValidHUSTEmail } from "@/utils/sanitize";
import { signIn, clearLoggedOut, isLoggedOut, requestTeacherApproval, subscribeUserDoc } from "@/services/auth.service";
import { isStudentVerified, sendOTP, verifyOTP, isEmailVerifyConfigured, isBypassMSSV } from "@/services/email-verify.service";
import { cacheRemove } from "@/utils/cache";
import { openWebview } from "zmp-sdk/apis";

type LoginStep = "mssv" | "email" | "otp" | "submitting" | "teacher" | "teacher-pending";

export default function LoginPage() {
  const navigate = useNavigate();
  const { currentUser, selectRole } = useAuth();
  const setCurrentUser = useSetAtom(currentUserAtom);
  const loading = useAtomValue(globalLoadingAtom);

  const [step, setStep] = useState<LoginStep>("mssv");
  const [mssv, setMssv] = useState("");
  const [mssvError, setMssvError] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [teacherDept, setTeacherDept] = useState("");
  const [teacherError, setTeacherError] = useState("");
  const [teacherSubmitting, setTeacherSubmitting] = useState(false);
  const [teacherRejected, setTeacherRejected] = useState(false);

  useEffect(() => {
    // Đang ở luồng giảng viên (nhập tên / chờ duyệt) → KHÔNG auto-redirect theo role cũ
    // (vd tài khoản đang là student/bypass). Màn chờ duyệt tự điều hướng khi admin duyệt.
    if (step === "teacher" || step === "teacher-pending") return;
    if (!currentUser || !currentUser.role) return;
    // Teacher/admin → vào luôn
    if (currentUser.role === "teacher" || currentUser.role === "admin") {
      navigate("/home", { replace: true }); return;
    }
    // Bypass MSSV hoặc EmailJS chưa cấu hình → vào luôn
    if (isBypassMSSV(currentUser.mssv || "") || !isEmailVerifyConfigured()) {
      navigate("/home", { replace: true }); return;
    }
    // Student: check verified
    isStudentVerified(currentUser.id).then((verified) => {
      if (verified) navigate("/home", { replace: true });
    });
  }, [currentUser, navigate, step]);

  // Màn chờ duyệt GV: lắng nghe realtime. Admin duyệt → vào /home; từ chối → báo lỗi.
  useEffect(() => {
    if (step !== "teacher-pending" || !currentUser) return;
    const unsub = subscribeUserDoc(currentUser.id, (u) => {
      if (!u) return;
      if (u.role === "teacher" || u.role === "admin") {
        setCurrentUser(u);
        navigate("/home", { replace: true });
      } else if (u.teacherRejected || u.pendingTeacher === false) {
        setCurrentUser(u);
        setTeacherRejected(true);
      }
    });
    return () => unsub();
  }, [step, currentUser?.id, navigate, setCurrentUser]);

  // Mở lại app khi đang chờ duyệt (chưa có role) → khôi phục màn chờ
  useEffect(() => {
    if (step === "mssv" && currentUser?.pendingTeacher && !currentUser.role) {
      setStep("teacher-pending");
    }
  }, [currentUser, step]);

  // Bước 1: Nhập MSSV → kiểm tra đã verify chưa
  const handleMSSVSubmit = async () => {
    const trimmed = mssv.trim();
    if (!trimmed) { setMssvError("Vui lòng nhập MSSV"); return; }
    if (!isValidMSSV(trimmed)) { setMssvError("MSSV không hợp lệ (8 chữ số, bắt đầu bằng 20)"); return; }
    setMssvError("");
    clearLoggedOut();

    // Ensure user exists. KHÔNG setCurrentUser ở đây: doc trên Firestore có thể
    // còn role + mssv của lần đăng nhập TRƯỚC → effect redirect sẽ nhảy vào
    // /home với mssv cũ (hiện lớp của tài khoản cũ) trước khi selectRole kịp
    // ghi mssv mới. Atom chỉ được set trong selectRole với mssv MỚI.
    let user = currentUser;
    if (!user) {
      user = await signIn();
    }

    // Bypass MSSV admin/test, đã verify, hoặc EmailJS chưa cấu hình → vào luôn
    const verified = await isStudentVerified(user.id);
    if (verified || isBypassMSSV(trimmed) || !isEmailVerifyConfigured()) {
      await completeLogin(user, trimmed);
      return;
    }

    // Chưa verify → sang bước nhập email
    setEmail(trimmed.toLowerCase() + "@sis.hust.edu.vn"); // auto-fill email
    setStep("email");
  };

  // Bước 2: Nhập email HUST → gửi OTP
  const handleSendOTP = async () => {
    if (!isValidHUSTEmail(email)) {
      setEmailError("Email phải có đuôi @sis.hust.edu.vn");
      return;
    }
    setEmailError("");
    setSending(true);

    const result = await sendOTP(email.trim(), mssv.trim());
    setSending(false);

    if (result.success) {
      setOtpMessage(result.message);
      setStep("otp");
    } else {
      setEmailError(result.message);
    }
  };

  // Bước 3: Nhập OTP → verify
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) { setOtpError("Mã xác minh gồm 6 chữ số"); return; }
    setOtpError("");

    // Không setCurrentUser với doc cũ — xem ghi chú ở handleMSSVSubmit
    let user = currentUser;
    if (!user) {
      user = await signIn();
    }

    const result = await verifyOTP(otp.trim(), user.id);
    if (result.success) {
      await completeLogin(user, mssv.trim());
    } else {
      setOtpError(result.message);
    }
  };

  // Bước GV: gửi yêu cầu làm giảng viên → chờ phòng đào tạo (admin) duyệt
  const handleTeacherRegister = async () => {
    const name = teacherName.trim();
    if (name.length < 2) { setTeacherError("Vui lòng nhập họ và tên"); return; }
    setTeacherError("");
    clearLoggedOut();
    setTeacherSubmitting(true);
    try {
      let user = currentUser;
      if (!user) {
        user = await signIn();
      }
      // GV/Admin đã được duyệt từ trước (logout xong đăng nhập lại) → vào thẳng,
      // KHÔNG gửi lại yêu cầu duyệt
      if (user.role === "teacher" || user.role === "admin") {
        setCurrentUser(user);
        navigate("/home", { replace: true });
        return;
      }
      setCurrentUser(user);
      await requestTeacherApproval(user.id, name, teacherDept.trim() || undefined);
      setCurrentUser({ ...user, name, pendingTeacher: true, teacherRejected: false });
      setTeacherRejected(false);
      setStep("teacher-pending");
    } catch {
      setTeacherError("Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setTeacherSubmitting(false);
    }
  };

  // Hoàn tất đăng nhập — KHÔNG xin quyền userInfo (chính sách 6.1)
  // User có thể cập nhật tên/avatar sau ở trang Profile
  const completeLogin = async (user: any, mssvValue: string) => {
    setStep("submitting");
    // Xóa cache lớp của MSSV này → lần vào home đầu tiên LUÔN tra Firestore
    // tươi xem MSSV có những lớp gì (tránh dính cache của phiên trước)
    await cacheRemove(`student_classes_${mssvValue}`).catch(() => {});
    await selectRole("student", mssvValue, user);
    navigate("/home", { replace: true });
  };

  // Loading screen
  if (!currentUser && !isLoggedOut()) {
    return (
      <Page style={{ background: "#f2f2f7", minHeight: "100vh", padding: 0 }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          minHeight: "100vh", gap: 16,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 36, background: "#be1d2c",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#fff", fontSize: 28, fontWeight: 700 }}>...</span>
          </div>
          <p style={{ color: "#9ca3af", fontSize: 13 }}>Đang kết nối...</p>
        </div>
      </Page>
    );
  }

  const displayName = currentUser?.name || "Sinh viên";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <Page style={{ background: "#f2f2f7", minHeight: "100vh", padding: "60px 24px 40px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>

        {/* Avatar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 36, background: "#be1d2c",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#ffffff", fontSize: 28, fontWeight: 700 }}>{initial}</span>
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>{displayName}</p>
          <p style={{ fontSize: 13, fontWeight: 500, color: "#9ca3af" }}>Tài khoản Zalo</p>
        </div>

        {/* ── BƯỚC 1: MSSV ── */}
        {step === "mssv" && (
          <>
            <div style={{
              width: "100%", height: 100, borderRadius: 16,
              background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
              </svg>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#be1d2c" }}>Sinh viên</span>
            </div>

            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>Mã số sinh viên</p>
              <input
                placeholder="VD: 20215678"
                value={mssv}
                onChange={(e) => { setMssv(e.target.value); setMssvError(""); }}
                inputMode="numeric"
                style={{
                  width: "100%", height: 48, borderRadius: 12,
                  background: "#ffffff", padding: "0 16px",
                  border: mssvError ? "1px solid #ef4444" : "1px solid rgba(0,0,0,0.06)",
                  fontSize: 15, color: "#1a1a1a", outline: "none", boxSizing: "border-box",
                }}
              />
              {mssvError && <p style={{ fontSize: 13, color: "#ef4444" }}>{mssvError}</p>}
            </div>

            <button
              onClick={handleMSSVSubmit}
              disabled={loading}
              style={{
                width: "100%", height: 52, borderRadius: 12,
                background: "#be1d2c", border: "none", color: "#ffffff",
                fontSize: 16, fontWeight: 700, opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Đang xử lý..." : "Tiếp tục"}
            </button>

            <button
              onClick={() => { setTeacherError(""); setStep("teacher"); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 13, color: "#6b7280", textDecoration: "underline",
                padding: 0,
              }}
            >
              Tôi là giảng viên
            </button>
          </>
        )}

        {/* ── BƯỚC 2: EMAIL TRƯỜNG ── */}
        {step === "email" && (
          <>
            <div style={{
              width: "100%", background: "#ffffff", borderRadius: 16, padding: 20,
              border: "1px solid rgba(0,0,0,0.04)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              display: "flex", flexDirection: "column", gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
                </svg>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>Xác minh danh tính sinh viên</p>
              </div>
              <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
                Nhập email do trường cấp để nhận mã xác minh. Chỉ cần xác minh một lần duy nhất.
              </p>
              <div style={{
                background: "rgba(190,29,44,0.06)", borderRadius: 10, padding: "8px 12px",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="8" r="4" /><path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" />
                </svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#be1d2c" }}>MSSV: {mssv}</span>
              </div>
            </div>

            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>Email sinh viên</p>
              <input
                placeholder="ten.xx123456@sis.hust.edu.vn"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                inputMode="email"
                style={{
                  width: "100%", height: 48, borderRadius: 12,
                  background: "#ffffff", padding: "0 16px",
                  border: emailError ? "1px solid #ef4444" : "1px solid rgba(0,0,0,0.06)",
                  fontSize: 14, color: "#1a1a1a", outline: "none", boxSizing: "border-box",
                }}
              />
              {emailError && <p style={{ fontSize: 13, color: "#ef4444" }}>{emailError}</p>}
            </div>

            <div style={{ width: "100%", display: "flex", gap: 12 }}>
              <button
                onClick={() => setStep("mssv")}
                style={{
                  flex: 1, height: 48, borderRadius: 12,
                  background: "#f0f0f5", border: "none",
                  fontSize: 15, fontWeight: 600, color: "#6b7280",
                }}
              >
                Quay lại
              </button>
              <button
                onClick={handleSendOTP}
                disabled={sending}
                style={{
                  flex: 2, height: 48, borderRadius: 12,
                  background: "#be1d2c", border: "none", color: "#ffffff",
                  fontSize: 15, fontWeight: 700, opacity: sending ? 0.7 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {sending ? <Spinner /> : null}
                {sending ? "Đang gửi..." : "Gửi mã xác minh"}
              </button>
            </div>
          </>
        )}

        {/* ── BƯỚC 3: NHẬP OTP ── */}
        {step === "otp" && (
          <>
            <div style={{
              width: "100%", background: "#ffffff", borderRadius: 16, padding: 20,
              border: "1px solid rgba(0,0,0,0.04)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" />
              </svg>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>Kiểm tra email</p>
              <p style={{ fontSize: 13, color: "#6b7280", textAlign: "center", lineHeight: 1.6 }}>
                {otpMessage || `Đã gửi mã xác minh đến ${email}`}
              </p>
              <div style={{
                background: "rgba(34,197,94,0.08)", borderRadius: 10, padding: "6px 14px",
              }}>
                <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>{email}</span>
              </div>
            </div>

            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>Mã xác minh (6 chữ số)</p>
              <input
                placeholder="000000"
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(""); }}
                inputMode="numeric"
                maxLength={6}
                style={{
                  width: "100%", height: 56, borderRadius: 12,
                  background: "#ffffff", padding: "0 16px",
                  border: otpError ? "1px solid #ef4444" : "1px solid rgba(0,0,0,0.06)",
                  fontSize: 24, fontWeight: 700, color: "#1a1a1a", outline: "none",
                  boxSizing: "border-box", textAlign: "center", letterSpacing: 8,
                }}
              />
              {otpError && <p style={{ fontSize: 13, color: "#ef4444" }}>{otpError}</p>}
            </div>

            <div style={{ width: "100%", display: "flex", gap: 12 }}>
              <button
                onClick={() => { setOtp(""); setOtpError(""); setStep("email"); }}
                style={{
                  flex: 1, height: 48, borderRadius: 12,
                  background: "#f0f0f5", border: "none",
                  fontSize: 15, fontWeight: 600, color: "#6b7280",
                }}
              >
                Gửi lại
              </button>
              <button
                onClick={handleVerifyOTP}
                disabled={otp.length !== 6}
                style={{
                  flex: 2, height: 48, borderRadius: 12,
                  background: otp.length === 6 ? "#be1d2c" : "#d4d4d4",
                  border: "none", color: "#ffffff",
                  fontSize: 15, fontWeight: 700,
                }}
              >
                Xác minh
              </button>
            </div>

            <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
              Mã có hiệu lực trong 10 phút
            </p>
          </>
        )}

        {/* ── BƯỚC GV: ĐĂNG KÝ LÀM GIẢNG VIÊN ── */}
        {step === "teacher" && (
          <>
            <div style={{
              width: "100%", height: 100, borderRadius: 16,
              background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#be1d2c" }}>Đăng ký giảng viên</span>
            </div>

            <div style={{
              width: "100%", background: "#ffffff", borderRadius: 16, padding: 20,
              border: "1px solid rgba(0,0,0,0.04)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              display: "flex", flexDirection: "column", gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>Gửi yêu cầu cấp quyền</p>
              </div>
              <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
                Nhập họ tên để gửi yêu cầu. Phòng Đào tạo sẽ duyệt và cấp quyền giảng viên cho bạn.
              </p>
            </div>

            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>Họ và tên</p>
              <input
                placeholder="VD: Nguyễn Văn A"
                value={teacherName}
                onChange={(e) => { setTeacherName(e.target.value); setTeacherError(""); }}
                style={{
                  width: "100%", height: 48, borderRadius: 12,
                  background: "#ffffff", padding: "0 16px",
                  border: teacherError ? "1px solid #ef4444" : "1px solid rgba(0,0,0,0.06)",
                  fontSize: 15, color: "#1a1a1a", outline: "none", boxSizing: "border-box",
                }}
              />
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginTop: 4 }}>Bộ môn / Khoa (tùy chọn)</p>
              <input
                placeholder="VD: Bộ môn Kỹ thuật Máy tính"
                value={teacherDept}
                onChange={(e) => setTeacherDept(e.target.value)}
                style={{
                  width: "100%", height: 48, borderRadius: 12,
                  background: "#ffffff", padding: "0 16px",
                  border: "1px solid rgba(0,0,0,0.06)",
                  fontSize: 15, color: "#1a1a1a", outline: "none", boxSizing: "border-box",
                }}
              />
              {teacherError && <p style={{ fontSize: 13, color: "#ef4444" }}>{teacherError}</p>}
            </div>

            <div style={{ width: "100%", display: "flex", gap: 12 }}>
              <button
                onClick={() => { setTeacherError(""); setStep("mssv"); }}
                style={{
                  flex: 1, height: 48, borderRadius: 12,
                  background: "#f0f0f5", border: "none",
                  fontSize: 15, fontWeight: 600, color: "#6b7280",
                }}
              >
                Quay lại
              </button>
              <button
                onClick={handleTeacherRegister}
                disabled={teacherSubmitting || teacherName.trim().length < 2}
                style={{
                  flex: 2, height: 48, borderRadius: 12,
                  background: teacherName.trim().length >= 2 ? "#be1d2c" : "#d4d4d4",
                  border: "none", color: "#ffffff",
                  fontSize: 15, fontWeight: 700,
                  opacity: teacherSubmitting ? 0.7 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {teacherSubmitting ? <Spinner /> : null}
                {teacherSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
              </button>
            </div>
          </>
        )}

        {/* ── MÀN CHỜ PHÒNG ĐÀO TẠO DUYỆT ── */}
        {step === "teacher-pending" && (
          <>
            <div style={{
              width: "100%", background: "#ffffff", borderRadius: 16, padding: "28px 20px",
              border: "1px solid rgba(0,0,0,0.04)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
            }}>
              {teacherRejected ? (
                <>
                  <div style={{
                    width: 56, height: 56, borderRadius: 28, background: "rgba(239,68,68,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>Yêu cầu bị từ chối</p>
                  <p style={{ fontSize: 13, color: "#6b7280", textAlign: "center", lineHeight: 1.6 }}>
                    Phòng Đào tạo chưa duyệt yêu cầu giảng viên của bạn. Vui lòng liên hệ để được hỗ trợ.
                  </p>
                </>
              ) : (
                <>
                  <Spinner />
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>Đang chờ duyệt</p>
                  <p style={{ fontSize: 13, color: "#6b7280", textAlign: "center", lineHeight: 1.6 }}>
                    Yêu cầu giảng viên của <strong>{teacherName || currentUser?.name}</strong> đã được gửi tới
                    Phòng Đào tạo. Màn hình sẽ tự chuyển khi được duyệt.
                  </p>
                  <div style={{ background: "rgba(190,29,44,0.06)", borderRadius: 10, padding: "8px 14px" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#be1d2c" }}>Đang đồng bộ realtime…</span>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => { setTeacherRejected(false); setStep("mssv"); }}
              style={{
                width: "100%", height: 48, borderRadius: 12,
                background: "#f0f0f5", border: "none",
                fontSize: 15, fontWeight: 600, color: "#6b7280",
              }}
            >
              Quay lại đăng nhập
            </button>
          </>
        )}

        {/* ── ĐANG XỬ LÝ ── */}
        {step === "submitting" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "40px 0" }}>
            <Spinner />
            <p style={{ color: "#6b7280", fontSize: 14 }}>Đang đăng nhập...</p>
          </div>
        )}

        {/* ── Privacy & Terms notice ── */}
        <p style={{
          fontSize: 12, color: "#9ca3af", textAlign: "center", lineHeight: 1.6,
          marginTop: 8, padding: "0 8px",
        }}>
          Khi tiếp tục, bạn đồng ý với{" "}
          <span
            onClick={() => openWebview({ url: "https://inhust-legal.web.app/terms.html" })}
            style={{ color: "#be1d2c", fontWeight: 600, textDecoration: "underline" }}
          >Điều khoản</span>
          {" "}và{" "}
          <span
            onClick={() => openWebview({ url: "https://inhust-legal.web.app/privacy-policy.html" })}
            style={{ color: "#be1d2c", fontWeight: 600, textDecoration: "underline" }}
          >Chính sách bảo mật</span>
          {" "}của Zimo Checkin.
        </p>
      </div>
    </Page>
  );
}
