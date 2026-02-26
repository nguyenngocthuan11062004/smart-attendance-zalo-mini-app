import React, { useEffect, useState } from "react";
import { Page, Box, Text, Avatar, Input } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAtomValue } from "jotai";
import { globalLoadingAtom } from "@/store/ui";
import type { UserRole } from "@/types";
import { isValidMSSV } from "@/utils/sanitize";
import logo from "@/static/icon_inhust.png";

export default function LoginPage() {
  const navigate = useNavigate();
  const { currentUser, selectRole } = useAuth();
  const loading = useAtomValue(globalLoadingAtom);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [mssv, setMssv] = useState("");
  const [mssvError, setMssvError] = useState("");

  // If user already has a role, go straight to home
  useEffect(() => {
    if (currentUser && currentUser.role) {
      navigate("/home", { replace: true });
    }
  }, [currentUser, navigate]);

  const handleSubmit = async () => {
    if (!selectedRole) return;

    if (selectedRole === "student") {
      const trimmed = mssv.trim();
      if (!trimmed) {
        setMssvError("Vui l\u00f2ng nh\u1eadp MSSV");
        return;
      }
      if (!isValidMSSV(trimmed)) {
        setMssvError("MSSV kh\u00f4ng h\u1ee3p l\u1ec7 (8 ch\u1eef s\u1ed1, b\u1eaft \u0111\u1ea7u b\u1eb1ng 20)");
        return;
      }
      setMssvError("");
      await selectRole("student", trimmed);
    } else {
      await selectRole("teacher");
    }

    navigate("/home", { replace: true });
  };

  // Waiting for auto Zalo sign-in to complete
  if (!currentUser) {
    return (
      <Page className="page page-no-header flex items-center justify-center" style={{ minHeight: "100vh", background: "#f2f2f7" }}>
        <div className="empty-state-dark">
          <img
            src={logo}
            alt="logo"
            style={{ width: 80, height: 80, borderRadius: 16, objectFit: "contain" }}
            className="mb-4"
          />
          <Text size="small" style={{ color: "#9ca3af" }}>{"\u0110ang k\u1ebft n\u1ed1i..."}</Text>
        </div>
      </Page>
    );
  }

  return (
    <Page className="page page-no-header" style={{ minHeight: "100vh", background: "#f2f2f7" }}>
      {/* User info from Zalo */}
      <div className="flex flex-col items-center pt-8 mb-6">
        <Avatar src={currentUser.avatar} size={72} />
        <Text bold size="xLarge" className="mt-3" style={{ color: "#1a1a1a" }}>{currentUser.name}</Text>
        <Text size="xSmall" className="mt-0.5" style={{ color: "#9ca3af" }}>{"T\u00e0i kho\u1ea3n Zalo"}</Text>
      </div>

      {/* Role selection */}
      <p className="section-label" style={{ color: "#6b7280" }}>{"B\u1ea1n l\u00e0 ai?"}</p>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          style={{
            padding: 16,
            borderRadius: 16,
            textAlign: "center",
            transition: "all 0.2s",
            background: selectedRole === "student" ? "#be1d2c" : "#ffffff",
            border: selectedRole === "student" ? "1px solid #be1d2c" : "1px solid rgba(0,0,0,0.06)",
            boxShadow: selectedRole === "student" ? "0 0 20px rgba(190,29,44,0.3)" : "0 1px 4px rgba(0,0,0,0.06)",
          }}
          onClick={() => { setSelectedRole("student"); setMssvError(""); }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              margin: "0 auto 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: selectedRole === "student" ? "rgba(255,255,255,0.2)" : "#f0f0f5",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={selectedRole === "student" ? "white" : "#be1d2c"} strokeWidth="1.5" strokeLinecap="round">
              <path d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: selectedRole === "student" ? "#ffffff" : "#1a1a1a" }}>
            {"Sinh vi\u00ean"}
          </p>
        </button>

        <button
          style={{
            padding: 16,
            borderRadius: 16,
            textAlign: "center",
            transition: "all 0.2s",
            background: selectedRole === "teacher" ? "#be1d2c" : "#ffffff",
            border: selectedRole === "teacher" ? "1px solid #be1d2c" : "1px solid rgba(0,0,0,0.06)",
            boxShadow: selectedRole === "teacher" ? "0 0 20px rgba(190,29,44,0.3)" : "0 1px 4px rgba(0,0,0,0.06)",
          }}
          onClick={() => { setSelectedRole("teacher"); setMssvError(""); }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              margin: "0 auto 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: selectedRole === "teacher" ? "rgba(255,255,255,0.2)" : "#f0f0f5",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={selectedRole === "teacher" ? "white" : "#be1d2c"} strokeWidth="1.5" strokeLinecap="round">
              <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: selectedRole === "teacher" ? "#ffffff" : "#1a1a1a" }}>
            {"Gi\u1ea3ng vi\u00ean"}
          </p>
        </button>
      </div>

      {/* MSSV input for students */}
      {selectedRole === "student" && (
        <div className="mb-5">
          <p className="section-label" style={{ color: "#6b7280" }}>{"M\u00e3 s\u1ed1 sinh vi\u00ean"}</p>
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              padding: 16,
              border: "1px solid rgba(0,0,0,0.06)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <Input
              placeholder="VD: 20215678"
              value={mssv}
              onChange={(e) => { setMssv(e.target.value); setMssvError(""); }}
              status={mssvError ? "error" : undefined}
              errorText={mssvError}
              style={{
                background: "#f0f0f5",
                color: "#1a1a1a",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 12,
              }}
            />
          </div>
        </div>
      )}

      {/* Submit button */}
      {selectedRole && (
        <button
          style={{
            width: "100%",
            padding: "12px 0",
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 14,
            color: "#ffffff",
            background: "#be1d2c",
            border: "none",
            opacity: loading ? 0.5 : 1,
            boxShadow: "0 2px 8px rgba(190,29,44,0.3)",
          }}
          className="active:opacity-90"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "\u0110ang x\u1eed l\u00fd..." : "Ti\u1ebfp t\u1ee5c"}
        </button>
      )}
    </Page>
  );
}
