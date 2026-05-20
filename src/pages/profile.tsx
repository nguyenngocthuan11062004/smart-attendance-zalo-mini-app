import React, { useState } from "react";
import { Page } from "zmp-ui";
import { useAtomValue, useSetAtom } from "jotai";
import { currentUserAtom, userRoleAtom } from "@/store/auth";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { openWebview } from "zmp-sdk/apis";
import { isValidPhone, isValidEmail } from "@/utils/sanitize";
import { storageSetItem } from "@/utils/storage";
import { requestUserInfo } from "@/services/auth.service";
import { deleteFaceData, hasFaceData } from "@/services/face.service";
// Microsoft OAuth hidden — requires Cloud Functions & redirects outside Zalo (causes rejection)
// import MicrosoftLinkCard from "@/components/profile/MicrosoftLinkCard";
import DarkModal from "@/components/ui/DarkModal";
import bkLogo from "@/static/bk_logo.png";
import bgProfile from "@/static/bgprofile.jpg";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "14px 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
      <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 600, color: "#1a1a1a" }}>{value}</p>
    </div>
  );
}

const EM_DASH = "—";

export default function ProfilePage() {
  const user = useAtomValue(currentUserAtom);
  const role = useAtomValue(userRoleAtom);
  const setUser = useSetAtom(currentUserAtom);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [editModal, setEditModal] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editBirthdate, setEditBirthdate] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editProgram, setEditProgram] = useState("");
  const [editClassName, setEditClassName] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [deleteFaceModal, setDeleteFaceModal] = useState(false);
  const [deletingFace, setDeletingFace] = useState(false);
  const [deleteFaceResult, setDeleteFaceResult] = useState<"" | "success" | "no-data" | "error">("");
  if (!user) return null;

  const handleDeleteFaceData = async () => {
    setDeletingFace(true);
    setDeleteFaceResult("");
    try {
      const exists = await hasFaceData(user.id);
      if (!exists) {
        setDeleteFaceResult("no-data");
        return;
      }
      const ok = await deleteFaceData(user.id);
      setDeleteFaceResult(ok ? "success" : "error");
    } finally {
      setDeletingFace(false);
    }
  };

  const isTeacherOrAdmin = role === "teacher" || role === "admin";

  const openEditModal = () => {
    setEditPhone(user.phone || "");
    setEditEmail(user.email || "");
    setEditBirthdate(user.birthdate || "");
    setEditDepartment(user.department || "");
    setEditProgram(user.program || "");
    setEditClassName(user.className || "");
    setEditModal(true);
  };

  const handleSaveProfile = async () => {
    setPhoneError("");
    setEmailError("");

    if (editPhone && !isValidPhone(editPhone)) {
      setPhoneError("Số điện thoại không hợp lệ");
      return;
    }
    if (editEmail && !isValidEmail(editEmail)) {
      setEmailError("Email không hợp lệ");
      return;
    }

    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (editPhone) updates.phone = editPhone;
    if (editEmail) updates.email = editEmail;
    if (editBirthdate) updates.birthdate = editBirthdate;
    if (editDepartment) updates.department = editDepartment;
    if (editProgram) updates.program = editProgram;
    // GV không có "Lớp" — chỉ student mới lưu className
    if (!isTeacherOrAdmin && editClassName) updates.className = editClassName;

    const updated = { ...user, ...updates };
    setUser(updated);
    await storageSetItem("user_doc", JSON.stringify(updated));
    setEditModal(false);

    // Persist to Firestore in background
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("@/config/firebase");
      await setDoc(doc(db, "users", user.id), updates, { merge: true });
    } catch {
      // Firestore unavailable — changes saved locally
    }
  };

  // Build fields cho edit modal — labels thay đổi theo role
  const editFields = [
    { label: "Số điện thoại", placeholder: "VD: 0986447465", value: editPhone, onChange: (v: string) => { setEditPhone(v); setPhoneError(""); }, error: phoneError },
    {
      label: isTeacherOrAdmin ? "Email công vụ" : "Email cá nhân",
      placeholder: isTeacherOrAdmin ? "VD: ten.lot@hust.edu.vn" : "VD: email@gmail.com",
      value: editEmail,
      onChange: (v: string) => { setEditEmail(v); setEmailError(""); },
      error: emailError,
    },
    { label: "Ngày sinh", placeholder: "VD: 11/06/2004", value: editBirthdate, onChange: setEditBirthdate },
    { label: "Khoa/Viện", placeholder: "VD: Trường CNTT&TT", value: editDepartment, onChange: setEditDepartment },
    {
      label: isTeacherOrAdmin ? "Bộ môn" : "Hệ",
      placeholder: isTeacherOrAdmin ? "VD: Bộ môn Kỹ thuật Máy tính" : "VD: Cử nhân - K67",
      value: editProgram,
      onChange: setEditProgram,
    },
    // Chỉ SV có trường "Lớp"
    ...(!isTeacherOrAdmin
      ? [{ label: "Lớp", placeholder: "VD: KTMT 03-K67", value: editClassName, onChange: setEditClassName }]
      : []),
  ];

  return (
    <Page style={{ background: "#f2f2f7", minHeight: "100vh", padding: 0 }}>
      {/* -- Red header with BK logo straddling header/photo -- */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <div
          style={{
            background: "#be1d2c",
            paddingTop: "calc(var(--zaui-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 14px)",
            paddingBottom: 32,
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          <div className="flex items-center justify-between">
            <div style={{ width: 26 }} />
            <span style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: 1.5 }}>
              inHUST
            </span>
            <div className="relative">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
          </div>
        </div>
        {/* BK logo at header/photo boundary */}
        <img
          src={bkLogo}
          alt="Bách Khoa"
          style={{
            position: "absolute",
            left: 16,
            bottom: -24,
            width: 56,
            height: 56,
            objectFit: "contain",
            zIndex: 10,
          }}
        />
      </div>

      {/* -- Profile card with bgprofile background (no gap) -- */}
      <div
        style={{
          background: `url(${bgProfile})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          padding: "20px 16px 24px",
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: 12,
            padding: "16px",
            display: "flex",
            alignItems: "center",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              style={{ width: 80, height: 80, borderRadius: 12, objectFit: "cover", flexShrink: 0 }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div style={{
              width: 80, height: 80, borderRadius: 12, background: "#be1d2c",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <span style={{ color: "#fff", fontSize: 32, fontWeight: 700 }}>{user.name?.charAt(0)?.toUpperCase() || "?"}</span>
            </div>
          )}
          <div className="ml-4 min-w-0 flex-1">
            <p style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 6 }}>
              {user.name}
            </p>
            {user.birthdate && (
              <p style={{ fontSize: 13, color: "#9ca3af" }}>
                Ngày sinh: <span style={{ color: "#1a1a1a", fontWeight: 500 }}>{user.birthdate}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* -- Info card — labels thay đổi theo role -- */}
      <div
        style={{
          margin: "0 16px",
          background: "#ffffff",
          borderRadius: 12,
          padding: "4px 20px 20px",
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        {isTeacherOrAdmin ? (
          <>
            <div className="grid grid-cols-2 gap-x-6">
              <div style={{ padding: "14px 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Email công vụ:</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#a78bfa", wordBreak: "break-all" }}>
                  {user.email || EM_DASH}
                </p>
              </div>
              <InfoRow label="Số điện thoại:" value={user.phone || EM_DASH} />
            </div>
            <InfoRow label="Khoa/Viện:" value={user.department || EM_DASH} />
            <InfoRow label="Bộ môn:" value={user.program || EM_DASH} />
            <InfoRow label="Vai trò:" value={role === "admin" ? "Quản trị viên" : "Giảng viên"} />
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-6">
              <InfoRow label="Mã sinh viên:" value={user.mssv || EM_DASH} />
              <InfoRow label="Ngày sinh:" value={user.birthdate || EM_DASH} />
            </div>
            <div className="grid grid-cols-2 gap-x-6">
              <div style={{ padding: "14px 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Email cá nhân:</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#a78bfa", wordBreak: "break-all" }}>
                  {user.email || EM_DASH}
                </p>
              </div>
              <InfoRow label="Số điện thoại:" value={user.phone || EM_DASH} />
            </div>
            <InfoRow label="Khoa/Viện:" value={user.department || EM_DASH} />
            <InfoRow label="Hệ:" value={user.program || EM_DASH} />
            <InfoRow label="Lớp:" value={user.className || EM_DASH} />
            <InfoRow label="Vai trò:" value="Sinh viên" />
          </>
        )}
        <div style={{ padding: "14px 0" }}>
          <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>ID:</p>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#d4d4d4", wordBreak: "break-all" }}>{user.id}</p>
        </div>
      </div>

      {/* -- Microsoft 365 Link (hidden — requires Cloud Functions & redirects outside Zalo) -- */}
      {/* <div style={{ margin: "16px 16px 0" }}>
        <MicrosoftLinkCard />
      </div> */}

      {/* -- Actions -- */}
      <div style={{ padding: "20px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Cập nhật tên + avatar từ Zalo */}
        <button
          onClick={async () => {
            const info = await requestUserInfo(user.id);
            if (info) {
              const updated = { ...user, name: info.name, avatar: info.avatar, updatedAt: Date.now() };
              setUser(updated);
              await storageSetItem("user_doc", JSON.stringify(updated));
            }
          }}
          style={{
            width: "100%", height: 48, borderRadius: 12,
            background: "#be1d2c", border: "none",
            fontSize: 15, fontWeight: 600, color: "#ffffff",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          Cập nhật tên và ảnh từ Zalo
        </button>

        <button
          onClick={openEditModal}
          style={{
            width: "100%", height: 48, borderRadius: 12,
            background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)",
            fontSize: 15, fontWeight: 600, color: "#1a1a1a",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Chỉnh sửa thông tin
        </button>
      </div>

      {/* -- Bottom section: Terms + Logout -- */}
      <div style={{
        padding: "16px 16px calc(100px + env(safe-area-inset-bottom, 0px))",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", marginBottom: 4 }} />
        <button
          onClick={() => openWebview({ url: "https://inhust-legal.web.app/terms.html" })}
          style={{
            width: "100%", height: 48, borderRadius: 12,
            background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)",
            fontSize: 15, fontWeight: 600, color: "#6b7280",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" />
          </svg>
          Điều khoản sử dụng
        </button>
        <button
          onClick={() => openWebview({ url: "https://inhust-legal.web.app/privacy-policy.html" })}
          style={{
            width: "100%", height: 48, borderRadius: 12,
            background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)",
            fontSize: 15, fontWeight: 600, color: "#6b7280",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Chính sách bảo mật
        </button>
        <button
          onClick={() => { setDeleteFaceResult(""); setDeleteFaceModal(true); }}
          style={{
            width: "100%", height: 48, borderRadius: 12,
            background: "#ffffff", border: "1px solid rgba(239,68,68,0.3)",
            fontSize: 15, fontWeight: 600, color: "#ef4444",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
          </svg>
          Xóa dữ liệu khuôn mặt
        </button>
        <button
          onClick={async () => {
            await logout();
            navigate("/splash", { replace: true });
          }}
          style={{
            width: "100%", height: 48, borderRadius: 12,
            background: "#ffffff", border: "2px solid #ef4444",
            fontSize: 15, fontWeight: 600, color: "#ef4444",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Đăng xuất
        </button>
      </div>

      {/* -- Edit modal -- */}
      <DarkModal visible={editModal} onClose={() => setEditModal(false)} title="Chỉnh sửa thông tin">
        <div style={{ padding: "0 4px", paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", gap: 14 }}>
          {editFields.map((f) => (
            <div key={f.label}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 6, display: "block" }}>{f.label}</label>
              <input
                placeholder={f.placeholder}
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                style={{
                  width: "100%", height: 44, borderRadius: 10, padding: "0 14px",
                  background: "#f0f0f5", border: f.error ? "1px solid #ef4444" : "1px solid rgba(0,0,0,0.06)",
                  fontSize: 15, color: "#1a1a1a", outline: "none", boxSizing: "border-box",
                }}
              />
              {f.error && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>{f.error}</p>}
            </div>
          ))}
          <button
            onClick={handleSaveProfile}
            style={{
              width: "100%", height: 48, borderRadius: 12,
              background: "#be1d2c", border: "none",
              color: "#ffffff", fontSize: 15, fontWeight: 700,
            }}
          >
            Lưu thay đổi
          </button>
        </div>
      </DarkModal>

      {/* -- Delete face data modal -- */}
      <DarkModal
        visible={deleteFaceModal}
        onClose={() => { if (!deletingFace) setDeleteFaceModal(false); }}
        title="Xóa dữ liệu khuôn mặt"
      >
        <div style={{ padding: "4px 4px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {deleteFaceResult === "" && (
            <>
              <div style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 12, padding: 16,
                display: "flex", gap: 12, alignItems: "flex-start",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>Bạn chắc chắn muốn xóa?</p>
                  <p style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.5 }}>
                    Vector đặc trưng khuôn mặt sẽ bị xóa vĩnh viễn khỏi máy chủ.
                    Bạn sẽ không thể điểm danh bằng khuôn mặt cho tới khi đăng ký lại.
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setDeleteFaceModal(false)}
                  disabled={deletingFace}
                  style={{
                    flex: 1, height: 48, borderRadius: 12,
                    background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)",
                    fontSize: 15, fontWeight: 600, color: "#6b7280",
                  }}
                >Hủy</button>
                <button
                  onClick={handleDeleteFaceData}
                  disabled={deletingFace}
                  style={{
                    flex: 1, height: 48, borderRadius: 12,
                    background: "#ef4444", border: "none",
                    fontSize: 15, fontWeight: 700, color: "#ffffff",
                    opacity: deletingFace ? 0.7 : 1,
                  }}
                >{deletingFace ? "Đang xóa..." : "Xóa vĩnh viễn"}</button>
              </div>
            </>
          )}
          {deleteFaceResult === "success" && (
            <>
              <p style={{ fontSize: 14, color: "#22c55e", fontWeight: 600 }}>
                ✓ Đã xóa dữ liệu khuôn mặt của bạn.
              </p>
              <button
                onClick={() => setDeleteFaceModal(false)}
                style={{
                  width: "100%", height: 48, borderRadius: 12,
                  background: "#be1d2c", border: "none",
                  fontSize: 15, fontWeight: 700, color: "#ffffff",
                }}
              >Đóng</button>
            </>
          )}
          {deleteFaceResult === "no-data" && (
            <>
              <p style={{ fontSize: 14, color: "#6b7280" }}>
                Bạn chưa đăng ký dữ liệu khuôn mặt. Không có gì để xóa.
              </p>
              <button
                onClick={() => setDeleteFaceModal(false)}
                style={{
                  width: "100%", height: 48, borderRadius: 12,
                  background: "#be1d2c", border: "none",
                  fontSize: 15, fontWeight: 700, color: "#ffffff",
                }}
              >Đóng</button>
            </>
          )}
          {deleteFaceResult === "error" && (
            <>
              <p style={{ fontSize: 14, color: "#ef4444" }}>
                Không thể xóa lúc này. Vui lòng kiểm tra kết nối mạng và thử lại.
              </p>
              <button
                onClick={() => setDeleteFaceResult("")}
                style={{
                  width: "100%", height: 48, borderRadius: 12,
                  background: "#be1d2c", border: "none",
                  fontSize: 15, fontWeight: 700, color: "#ffffff",
                }}
              >Thử lại</button>
            </>
          )}
        </div>
      </DarkModal>
    </Page>
  );
}
