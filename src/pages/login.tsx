import React, { useEffect, useState } from "react";
import { Page, Box, Text, Avatar, Input } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAtomValue } from "jotai";
import { globalLoadingAtom } from "@/store/ui";
import type { UserRole } from "@/types";
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
        setMssvError("Vui long nhap MSSV");
        return;
      }
      if (trimmed.length < 5) {
        setMssvError("MSSV khong hop le");
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
      <Page className="page page-no-header flex items-center justify-center" style={{ minHeight: "100vh" }}>
        <div className="empty-state">
          <img
            src={logo}
            alt="logo"
            style={{ width: 80, height: 80, borderRadius: 16, objectFit: "contain" }}
            className="mb-4"
          />
          <Text size="small" className="text-gray-400">Dang ket noi...</Text>
        </div>
      </Page>
    );
  }

  return (
    <Page className="page page-no-header" style={{ minHeight: "100vh" }}>
      {/* User info from Zalo */}
      <div className="flex flex-col items-center pt-8 mb-6">
        <Avatar src={currentUser.avatar} size={72} />
        <Text bold size="xLarge" className="mt-3">{currentUser.name}</Text>
        <Text size="xSmall" className="text-gray-400 mt-0.5">Tai khoan Zalo</Text>
      </div>

      {/* Role selection */}
      <p className="section-label">Ban la ai?</p>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          className={`p-4 rounded-2xl text-center transition-all ${
            selectedRole === "student"
              ? "bg-red-500 text-white shadow-lg shadow-red-200"
              : "card-flat"
          }`}
          onClick={() => { setSelectedRole("student"); setMssvError(""); }}
        >
          <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
            selectedRole === "student" ? "bg-white/20" : "bg-red-50"
          }`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={selectedRole === "student" ? "white" : "#ef4444"} strokeWidth="1.5" strokeLinecap="round">
              <path d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
          </div>
          <p className={`text-sm font-bold ${selectedRole === "student" ? "text-white" : "text-gray-700"}`}>
            Sinh vien
          </p>
        </button>

        <button
          className={`p-4 rounded-2xl text-center transition-all ${
            selectedRole === "teacher"
              ? "bg-red-600 text-white shadow-lg shadow-red-200"
              : "card-flat"
          }`}
          onClick={() => { setSelectedRole("teacher"); setMssvError(""); }}
        >
          <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
            selectedRole === "teacher" ? "bg-white/20" : "bg-red-50"
          }`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={selectedRole === "teacher" ? "white" : "#dc2626"} strokeWidth="1.5" strokeLinecap="round">
              <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <p className={`text-sm font-bold ${selectedRole === "teacher" ? "text-white" : "text-gray-700"}`}>
            Giang vien
          </p>
        </button>
      </div>

      {/* MSSV input for students */}
      {selectedRole === "student" && (
        <div className="mb-5">
          <p className="section-label">Ma so sinh vien</p>
          <div className="card-flat p-4">
            <Input
              placeholder="VD: 20215678"
              value={mssv}
              onChange={(e) => { setMssv(e.target.value); setMssvError(""); }}
              status={mssvError ? "error" : undefined}
              errorText={mssvError}
            />
          </div>
        </div>
      )}

      {/* Submit button */}
      {selectedRole && (
        <button
          className={`w-full py-3 rounded-xl font-semibold text-sm text-white active:opacity-90 ${
            loading ? "opacity-50" : ""
          } ${selectedRole === "student" ? "bg-red-500" : "bg-red-600"}`}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Dang xu ly..." : "Tiep tuc"}
        </button>
      )}
    </Page>
  );
}
