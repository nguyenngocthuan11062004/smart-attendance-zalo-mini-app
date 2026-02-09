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
    <Page className="page page-no-header">
      <div className="gradient-blue rounded-2xl p-4 mb-4 text-white">
        <p className="text-lg font-bold">Dev Navigation</p>
        <p className="text-white/60 text-xs mt-0.5">Nhay vao bat ky man hinh nao de test</p>
      </div>

      {/* Mock mode toggle */}
      <div className={`card-flat p-4 mb-5 ${mockOn ? "border-2 border-emerald-200" : ""}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${mockOn ? "bg-emerald-500" : "bg-gray-300"}`} />
            <Text bold size="normal">Mock Mode</Text>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            mockOn ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
          }`}>
            {mockOn ? "ON" : "OFF"}
          </span>
        </div>
        <Text size="xxSmall" className="text-gray-400 mb-3">
          {mockOn
            ? "3 lop, 8 SV, 3 phien, 13 records"
            : "Bat de chay offline, du lieu in-memory"
          }
        </Text>
        <button
          className={`w-full py-2 rounded-xl text-sm font-semibold ${
            mockOn
              ? "bg-gray-100 text-gray-600 active:bg-gray-200"
              : "bg-emerald-500 text-white active:bg-emerald-600"
          }`}
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
      className="card-flat p-3 active:bg-gray-50 flex items-center justify-between"
      onClick={onClick}
    >
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {desc && <p className="text-[10px] text-gray-400 font-mono">{desc}</p>}
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round">
        <path d="M6 3l5 5-5 5" />
      </svg>
    </div>
  );
}
