import React, { useState } from "react";
import { Page, Avatar, Input, Box, Button } from "zmp-ui";
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

  const handleSaveProfile = () => {
    setPhoneError("");
    setEmailError("");

    if (editPhone && !isValidPhone(editPhone)) {
      setPhoneError("S\u1ed1 \u0111i\u1ec7n tho\u1ea1i kh\u00f4ng h\u1ee3p l\u1ec7");
      return;
    }
    if (editEmail && !isValidEmail(editEmail)) {
      setEmailError("Email kh\u00f4ng h\u1ee3p l\u1ec7");
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
    <Page style={{ background: "#f2f2f7", minHeight: "100vh", padding: 0 }}>
      {/* -- Red header with BK logo straddling header/photo -- */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <div
          style={{
            background: "#be1d2c",
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
          alt="B\u00e1ch Khoa"
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
            borderRadius: 16,
            padding: "16px",
            display: "flex",
            alignItems: "center",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <Avatar src={user.avatar} size={80} style={{ borderRadius: 12, flexShrink: 0 }} />
          <div className="ml-4 min-w-0 flex-1">
            <p style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 6 }}>
              {user.name}
            </p>
            {user.phone && (
              <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 3 }}>
                S\u0110T: <span style={{ color: "#a78bfa", textDecoration: "underline" }}>{user.phone}</span>
              </p>
            )}
            <p className="truncate" style={{ fontSize: 13, color: "#9ca3af" }}>
              Email: <span style={{ color: "#a78bfa", textDecoration: "underline" }}>{email}</span>
            </p>
          </div>
        </div>
      </div>

      {/* -- Info card -- */}
      <div
        style={{
          margin: "0 16px",
          background: "#ffffff",
          borderRadius: 16,
          padding: "4px 20px 20px",
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <div className="grid grid-cols-2 gap-x-6">
          <InfoRow label="M\u00e3 sinh vi\u00ean:" value={user.mssv || "\u2014"} />
          <InfoRow label="Ng\u00e0y sinh:" value={user.birthdate || "\u2014"} />
        </div>
        <div className="grid grid-cols-2 gap-x-6">
          <div style={{ padding: "14px 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Email c\u00e1 nh\u00e2n:</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#a78bfa", wordBreak: "break-all" }}>
              {user.email || "\u2014"}
            </p>
          </div>
          <InfoRow label="S\u1ed1 \u0111i\u1ec7n tho\u1ea1i:" value={user.phone || "\u2014"} />
        </div>
        <InfoRow label="Khoa/Vi\u1ec7n:" value={user.department || "\u2014"} />
        <InfoRow label="H\u1ec7:" value={user.program || "\u2014"} />
        <InfoRow label="L\u1edbp:" value={user.className || "\u2014"} />
      </div>

      {/* -- Microsoft 365 Link -- */}
      <div style={{ margin: "16px 16px 0" }}>
        <MicrosoftLinkCard />
      </div>

      {/* -- Edit + Logout -- */}
      <div style={{ padding: "20px 16px 100px" }}>
        <button
          className="w-full"
          style={{
            padding: "11px 0",
            borderRadius: 12,
            background: "#ffffff",
            color: "#a78bfa",
            fontSize: 14,
            fontWeight: 600,
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            marginBottom: 10,
          }}
          onClick={openEditModal}
        >
          Ch\u1ec9nh s\u1eeda th\u00f4ng tin
        </button>
        <button
          className="w-full"
          style={{
            padding: "11px 0",
            borderRadius: 12,
            background: "#ffffff",
            color: "#ef4444",
            fontSize: 14,
            fontWeight: 600,
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
        >
          \u0110\u0103ng xu\u1ea5t
        </button>
      </div>

      {/* -- Edit modal -- */}
      <DarkModal visible={editModal} onClose={() => setEditModal(false)} title="Ch\u1ec9nh s\u1eeda th\u00f4ng tin">
        <Box className="p-4 space-y-3">
          <Input label="S\u1ed1 \u0111i\u1ec7n tho\u1ea1i" placeholder="VD: 0986447465" value={editPhone} onChange={(e) => { setEditPhone(e.target.value); setPhoneError(""); }} status={phoneError ? "error" : undefined} errorText={phoneError} />
          <Input label="Email c\u00e1 nh\u00e2n" placeholder="VD: email@gmail.com" value={editEmail} onChange={(e) => { setEditEmail(e.target.value); setEmailError(""); }} status={emailError ? "error" : undefined} errorText={emailError} />
          <Input label="Ng\u00e0y sinh" placeholder="VD: 11/06/2004" value={editBirthdate} onChange={(e) => setEditBirthdate(e.target.value)} />
          <Input label="Khoa/Vi\u1ec7n" placeholder="VD: Tr\u01b0\u1eddng CNTT&TT" value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} />
          <Input label="H\u1ec7" placeholder="VD: C\u1eed nh\u00e2n - K67" value={editProgram} onChange={(e) => setEditProgram(e.target.value)} />
          <Input label="L\u1edbp" placeholder="VD: KTMT 03-K67" value={editClassName} onChange={(e) => setEditClassName(e.target.value)} />
          <button
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 12,
              background: "#be1d2c",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              boxShadow: "0 2px 8px rgba(190,29,44,0.3)",
            }}
            onClick={handleSaveProfile}
          >
            L\u01b0u thay \u0111\u1ed5i
          </button>
        </Box>
      </DarkModal>
    </Page>
  );
}
