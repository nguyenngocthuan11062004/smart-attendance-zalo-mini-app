import React, { useState } from "react";
import { Page, Box, Button, Text } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useSetAtom } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { activeSessionAtom } from "@/store/session";
import { mockStudent, mockTeacher, mockSession } from "@/utils/mock-data";
import { isMockMode, setMockMode, seedMockData } from "@/utils/mock-db";

export default function DevPage() {
  const navigate = useNavigate();
  const setUser = useSetAtom(currentUserAtom);
  const setSession = useSetAtom(activeSessionAtom);
  const [mockOn, setMockOn] = useState(isMockMode());
  const [seeded, setSeeded] = useState(false);

  const enableMock = () => {
    setMockMode(true);
    seedMockData();
    setMockOn(true);
    setSeeded(true);
  };

  const disableMock = () => {
    setMockMode(false);
    setMockOn(false);
    setSeeded(false);
  };

  const goAs = (role: "student" | "teacher", path: string) => {
    setUser(role === "student" ? mockStudent : mockTeacher);
    if (path.includes("monitor") || path.includes("attendance/session")) {
      setSession(mockSession);
    }
    navigate(path);
  };

  return (
    <Page className="page page-no-header" style={{ background: "#f2f2f7" }}>
      <div style={{ background: "#ffffff", borderRadius: 20, padding: 16, marginBottom: 16, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>Dev Navigation</p>
        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>Nhay vao bat ky man hinh nao de test</p>
      </div>

      {/* Mock mode toggle */}
      <div style={{
        background: "#ffffff",
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        border: mockOn ? "2px solid rgba(34,197,94,0.3)" : "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: mockOn ? "#22c55e" : "#9ca3af" }} />
            <span style={{ fontWeight: 700, color: "#1a1a1a" }}>Mock Mode</span>
          </div>
          <span style={{
            padding: "2px 8px",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 700,
            background: mockOn ? "rgba(34,197,94,0.15)" : "#e5e7eb",
            color: mockOn ? "#22c55e" : "#9ca3af",
          }}>
            {mockOn ? "ON" : "OFF"}
          </span>
        </div>
        <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 12 }}>
          {mockOn
            ? "3 lop, 8 SV, 3 phien, 13 records"
            : "Bat de chay offline, du lieu in-memory"
          }
        </p>
        <button
          style={{
            width: "100%",
            padding: "10px 0",
            borderRadius: 14,
            fontSize: 14,
            fontWeight: 600,
            border: "none",
            background: mockOn ? "#e5e7eb" : "#22c55e",
            color: mockOn ? "#6b7280" : "#fff",
          }}
          onClick={mockOn ? disableMock : enableMock}
        >
          {mockOn ? "Tat Mock Mode" : "Bat Mock Mode + Tao du lieu"}
        </button>
      </div>

      {/* Common */}
      <p className="section-label">Common</p>
      <div className="space-y-1.5 mb-4">
        <NavButton label="Splash" onClick={() => navigate("/splash")} />
        <NavButton label="Welcome" onClick={() => navigate("/welcome")} />
        <NavButton label="Login" onClick={() => navigate("/login")} />
      </div>

      {/* Student */}
      <p className="section-label">Student (Nguyen Van A)</p>
      <div className="space-y-1.5 mb-4">
        <NavButton label="Home (Student)" onClick={() => goAs("student", "/home")} />
        <NavButton label="Student Classes" onClick={() => goAs("student", "/student/classes")} />
        <NavButton label="Student Attendance" onClick={() => goAs("student", "/student/attendance/session_001")} desc="session_001" />
        <NavButton label="Student History" onClick={() => goAs("student", "/student/history")} />
        <NavButton label="Face Register" onClick={() => goAs("student", "/student/face-register")} />
      </div>

      {/* Teacher */}
      <p className="section-label">Teacher (Tran Thi B)</p>
      <div className="space-y-1.5 mb-4">
        <NavButton label="Home (Teacher)" onClick={() => goAs("teacher", "/home")} />
        <NavButton label="Teacher Classes" onClick={() => goAs("teacher", "/teacher/classes")} />
        <NavButton label="Lap trinh Web" onClick={() => goAs("teacher", "/teacher/class/class_001")} desc="class_001" />
        <NavButton label="Co so du lieu" onClick={() => goAs("teacher", "/teacher/class/class_002")} desc="class_002" />
        <NavButton label="Mang may tinh" onClick={() => goAs("teacher", "/teacher/class/class_003")} desc="class_003" />
        <NavButton label="Session" onClick={() => goAs("teacher", "/teacher/session/class_001")} desc="class_001" />
        <NavButton label="Monitor" onClick={() => goAs("teacher", "/teacher/monitor/session_001")} desc="session_001" />
        <NavButton label="Review (5/7 SV)" onClick={() => goAs("teacher", "/teacher/review/session_001")} desc="session_001" />
        <NavButton label="Review (6/7 SV)" onClick={() => goAs("teacher", "/teacher/review/session_002")} desc="session_002" />
        <NavButton label="Fraud Report" onClick={() => goAs("teacher", "/teacher/fraud/class_001")} desc="class_001" />
      </div>
    </Page>
  );
}

function NavButton({ label, onClick, desc }: { label: string; onClick: () => void; desc?: string }) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 16,
        padding: 12,
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
      onClick={onClick}
    >
      <div>
        <p style={{ fontSize: 14, fontWeight: 500, color: "#1a1a1a" }}>{label}</p>
        {desc && <p style={{ fontSize: 10, color: "#9ca3af", fontFamily: "Roboto Mono, monospace" }}>{desc}</p>}
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
        <path d="M6 3l5 5-5 5" />
      </svg>
    </div>
  );
}
