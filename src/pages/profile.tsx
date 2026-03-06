import React, { useState } from "react";
import { Page } from "zmp-ui";
import { useAtomValue, useSetAtom } from "jotai";
import { currentUserAtom, userRoleAtom } from "@/store/auth";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { isValidPhone, isValidEmail } from "@/utils/sanitize";
import MicrosoftLinkCard from "@/components/profile/MicrosoftLinkCard";
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
  if (!user) return null;

  const email = user.email
    || (user.mssv ? `${user.name.toLowerCase().replace(/\s/g, ".")}@sis.hust.edu.vn` : "");

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
    if (editClassName) updates.className = editClassName;

    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem("user_doc", JSON.stringify(updated));
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

      {/* -- Info card -- */}
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
        <div className="grid grid-cols-2 gap-x-6">
          <InfoRow label="Mã sinh viên:" value={user.mssv || "\u2014"} />
          <InfoRow label="Ngày sinh:" value={user.birthdate || "\u2014"} />
        </div>
        <div className="grid grid-cols-2 gap-x-6">
          <div style={{ padding: "14px 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Email cá nhân:</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#a78bfa", wordBreak: "break-all" }}>
              {user.email || "\u2014"}
            </p>
          </div>
          <InfoRow label="Số điện thoại:" value={user.phone || "\u2014"} />
        </div>
        <InfoRow label="Khoa/Viện:" value={user.department || "\u2014"} />
        <InfoRow label="Hệ:" value={user.program || "\u2014"} />
        <InfoRow label="Lớp:" value={user.className || "\u2014"} />
      </div>

      {/* -- Microsoft 365 Link -- */}
      <div style={{ margin: "16px 16px 0" }}>
        <MicrosoftLinkCard />
      </div>

      {/* -- Edit + Switch Role + Logout -- */}
      <div style={{ padding: "20px 16px", paddingBottom: "calc(90px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", gap: 10 }}>
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
        <button
          onClick={() => {
            const updated = { ...user, role: "" as any, updatedAt: Date.now() };
            setUser(updated);
            localStorage.setItem("user_doc", JSON.stringify(updated));
            navigate("/login", { replace: true });
          }}
          style={{
            width: "100%", height: 48, borderRadius: 12,
            background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)",
            fontSize: 15, fontWeight: 600, color: "#f59e0b",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" />
          </svg>
          Đổi vai trò
        </button>
        <button
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          style={{
            width: "100%", height: 48, borderRadius: 12,
            background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)",
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
        <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "Số điện thoại", placeholder: "VD: 0986447465", value: editPhone, onChange: (v: string) => { setEditPhone(v); setPhoneError(""); }, error: phoneError },
            { label: "Email cá nhân", placeholder: "VD: email@gmail.com", value: editEmail, onChange: (v: string) => { setEditEmail(v); setEmailError(""); }, error: emailError },
            { label: "Ngày sinh", placeholder: "VD: 11/06/2004", value: editBirthdate, onChange: setEditBirthdate },
            { label: "Khoa/Viện", placeholder: "VD: Trường CNTT&TT", value: editDepartment, onChange: setEditDepartment },
            { label: "Hệ", placeholder: "VD: Cử nhân - K67", value: editProgram, onChange: setEditProgram },
            { label: "Lớp", placeholder: "VD: KTMT 03-K67", value: editClassName, onChange: setEditClassName },
          ].map((f) => (
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
    </Page>
  );
}
