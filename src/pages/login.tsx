import React, { useEffect, useState } from "react";
import { Page } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAtomValue } from "jotai";
import { globalLoadingAtom } from "@/store/ui";
import type { UserRole } from "@/types";
import { isValidMSSV } from "@/utils/sanitize";

export default function LoginPage() {
  const navigate = useNavigate();
  const { currentUser, selectRole } = useAuth();
  const loading = useAtomValue(globalLoadingAtom);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [mssv, setMssv] = useState("");
  const [mssvError, setMssvError] = useState("");

  useEffect(() => {
    if (currentUser && currentUser.role && currentUser.role !== "") {
      navigate("/home", { replace: true });
    }
  }, [currentUser, navigate]);

  const handleSubmit = async () => {
    if (!selectedRole) return;

    if (selectedRole === "student") {
      const trimmed = mssv.trim();
      if (!trimmed) {
        setMssvError("Vui lòng nhập MSSV");
        return;
      }
      if (!isValidMSSV(trimmed)) {
        setMssvError("MSSV không hợp lệ (8 chữ số, bắt đầu bằng 20)");
        return;
      }
      setMssvError("");
      await selectRole("student", trimmed);
    } else {
      await selectRole("teacher");
    }

    navigate("/home", { replace: true });
  };

  // Waiting for Zalo sign-in
  if (!currentUser) {
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

  const initial = currentUser.name?.charAt(0)?.toUpperCase() || "?";

  return (
    <Page style={{ background: "#f2f2f7", minHeight: "100vh", padding: "60px 24px 40px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>

        {/* Avatar section */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 36, background: "#be1d2c",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#ffffff", fontSize: 28, fontWeight: 700 }}>{initial}</span>
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>{currentUser.name}</p>
          <p style={{ fontSize: 13, fontWeight: 500, color: "#9ca3af" }}>Tài khoản Zalo</p>
        </div>

        {/* Section label */}
        <p style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: 1 }}>CHỌN VAI TRÒ</p>

        {/* Role grid */}
        <div style={{ display: "flex", gap: 12, width: "100%" }}>
          {/* Sinh viên */}
          <button
            onClick={() => { setSelectedRole("student"); setMssvError(""); }}
            style={{
              flex: 1, height: 120, borderRadius: 16, border: "none",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
              background: selectedRole === "student" ? "#be1d2c" : "#ffffff",
              boxShadow: selectedRole === "student" ? "0 4px 20px rgba(190,29,44,0.25)" : "none",
              ...(selectedRole !== "student" ? { border: "1px solid rgba(0,0,0,0.06)" } as any : {}),
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={selectedRole === "student" ? "#ffffff" : "#6b7280"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
            <span style={{ fontSize: 16, fontWeight: 700, color: selectedRole === "student" ? "#ffffff" : "#6b7280" }}>Sinh viên</span>
          </button>

          {/* Giảng viên */}
          <button
            onClick={() => { setSelectedRole("teacher"); setMssvError(""); }}
            style={{
              flex: 1, height: 120, borderRadius: 16, border: "none",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
              background: selectedRole === "teacher" ? "#be1d2c" : "#ffffff",
              boxShadow: selectedRole === "teacher" ? "0 4px 20px rgba(190,29,44,0.25)" : "none",
              ...(selectedRole !== "teacher" ? { border: "1px solid rgba(0,0,0,0.06)" } as any : {}),
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={selectedRole === "teacher" ? "#ffffff" : "#6b7280"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 3h-8l-2 4h12z" /><path d="M12 11v4M10 13h4" />
            </svg>
            <span style={{ fontSize: 16, fontWeight: selectedRole === "teacher" ? 700 : 600, color: selectedRole === "teacher" ? "#ffffff" : "#6b7280" }}>Giảng viên</span>
          </button>
        </div>

        {/* MSSV input for students */}
        {selectedRole === "student" && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>Mã số sinh viên</p>
            <input
              placeholder="VD: 20215678"
              value={mssv}
              onChange={(e) => { setMssv(e.target.value); setMssvError(""); }}
              style={{
                width: "100%", height: 48, borderRadius: 12,
                background: "#ffffff", padding: "0 16px",
                border: mssvError ? "1px solid #ef4444" : "1px solid rgba(0,0,0,0.06)",
                fontSize: 15, color: "#1a1a1a", outline: "none",
                boxSizing: "border-box",
              }}
            />
            {mssvError && (
              <p style={{ fontSize: 13, color: "#ef4444" }}>{mssvError}</p>
            )}
          </div>
        )}

        {/* Continue button */}
        <button
          onClick={handleSubmit}
          disabled={!selectedRole || loading}
          style={{
            width: "100%", height: 52, borderRadius: 12,
            background: selectedRole ? "#be1d2c" : "#d4d4d4",
            border: "none", color: "#ffffff", fontSize: 16, fontWeight: 700,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Đang xử lý..." : "Tiếp tục"}
        </button>
      </div>
    </Page>
  );
}
