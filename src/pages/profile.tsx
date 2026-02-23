import React, { useState } from "react";
import { Page, Avatar, Input, Modal, Box, Button } from "zmp-ui";
import { useAtomValue, useSetAtom } from "jotai";
import { currentUserAtom, userRoleAtom } from "@/store/auth";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { isValidPhone, isValidEmail } from "@/utils/sanitize";
import MicrosoftLinkCard from "@/components/profile/MicrosoftLinkCard";
import bkLogo from "@/static/bk_logo.png";
import bgProfile from "@/static/bgprofile.jpg";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "14px 0", borderBottom: "1px solid #f3f4f6" }}>
      <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 600, color: "#1f2937" }}>{value}</p>
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

  const handleSaveProfile = () => {
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

    setUser({
      ...user,
      phone: editPhone || undefined,
      email: editEmail || undefined,
      birthdate: editBirthdate || undefined,
      department: editDepartment || undefined,
      program: editProgram || undefined,
      className: editClassName || undefined,
      updatedAt: Date.now(),
    });
    setEditModal(false);
  };

  return (
    <Page style={{ background: "#f3f4f6", minHeight: "100vh", padding: 0 }}>
      {/* ── Red header with BK logo straddling header/photo ── */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <div
          style={{
            background: "linear-gradient(180deg, #b91c1c 0%, #991b1b 100%)",
            paddingTop: "calc(var(--zaui-safe-area-inset-top, 0px) + 10px)",
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

      {/* ── Profile card with bgprofile background (no gap) ── */}
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
            background: "rgba(255,255,255,0.92)",
            borderRadius: 16,
            padding: "16px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Avatar src={user.avatar} size={80} style={{ borderRadius: 12, flexShrink: 0 }} />
          <div className="ml-4 min-w-0 flex-1">
            <p style={{ fontSize: 18, fontWeight: 700, color: "#1f2937", marginBottom: 6 }}>
              {user.name}
            </p>
            {user.phone && (
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 3 }}>
                SĐT: <span style={{ color: "#2563eb", textDecoration: "underline" }}>{user.phone}</span>
              </p>
            )}
            <p className="truncate" style={{ fontSize: 13, color: "#6b7280" }}>
              Email: <span style={{ color: "#2563eb", textDecoration: "underline" }}>{email}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Info card ── */}
      <div
        style={{
          margin: "0 16px",
          background: "#fff",
          borderRadius: 16,
          padding: "4px 20px 20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <div className="grid grid-cols-2 gap-x-6">
          <InfoRow label="Mã sinh viên:" value={user.mssv || "—"} />
          <InfoRow label="Ngày sinh:" value={user.birthdate || "—"} />
        </div>
        <div className="grid grid-cols-2 gap-x-6">
          <div style={{ padding: "14px 0", borderBottom: "1px solid #f3f4f6" }}>
            <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Email cá nhân:</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#2563eb", wordBreak: "break-all" }}>
              {user.email || "—"}
            </p>
          </div>
          <InfoRow label="Số điện thoại:" value={user.phone || "—"} />
        </div>
        <InfoRow label="Khoa/Viện:" value={user.department || "—"} />
        <InfoRow label="Hệ:" value={user.program || "—"} />
        <InfoRow label="Lớp:" value={user.className || "—"} />
      </div>

      {/* ── Microsoft 365 Link ── */}
      <div style={{ margin: "16px 16px 0" }}>
        <MicrosoftLinkCard />
      </div>

      {/* ── Edit + Logout ── */}
      <div style={{ padding: "20px 16px 100px" }}>
        <button
          className="w-full active:bg-gray-50"
          style={{
            padding: "11px 0",
            borderRadius: 12,
            background: "#fff",
            color: "#2563eb",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            marginBottom: 10,
          }}
          onClick={openEditModal}
        >
          Chỉnh sửa thông tin
        </button>
        <button
          className="w-full active:bg-gray-200"
          style={{
            padding: "11px 0",
            borderRadius: 12,
            background: "#fff",
            color: "#ef4444",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
        >
          Đăng xuất
        </button>
      </div>

      {/* ── Edit modal ── */}
      <Modal visible={editModal} onClose={() => setEditModal(false)} title="Chỉnh sửa thông tin">
        <Box className="p-4 space-y-3">
          <Input label="Số điện thoại" placeholder="VD: 0986447465" value={editPhone} onChange={(e) => { setEditPhone(e.target.value); setPhoneError(""); }} status={phoneError ? "error" : undefined} errorText={phoneError} />
          <Input label="Email cá nhân" placeholder="VD: email@gmail.com" value={editEmail} onChange={(e) => { setEditEmail(e.target.value); setEmailError(""); }} status={emailError ? "error" : undefined} errorText={emailError} />
          <Input label="Ngày sinh" placeholder="VD: 11/06/2004" value={editBirthdate} onChange={(e) => setEditBirthdate(e.target.value)} />
          <Input label="Khoa/Viện" placeholder="VD: Trường CNTT&TT" value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} />
          <Input label="Hệ" placeholder="VD: Cử nhân - K67" value={editProgram} onChange={(e) => setEditProgram(e.target.value)} />
          <Input label="Lớp" placeholder="VD: KTMT 03-K67" value={editClassName} onChange={(e) => setEditClassName(e.target.value)} />
          <Button fullWidth variant="primary" onClick={handleSaveProfile}>
            Lưu thay đổi
          </Button>
        </Box>
      </Modal>
    </Page>
  );
}
