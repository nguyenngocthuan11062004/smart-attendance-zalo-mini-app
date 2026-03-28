import React, { useState, useEffect, useRef, useCallback } from "react";
import { Page, Box, Text, Button } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useSetAtom } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { activeSessionAtom } from "@/store/session";
import { mockStudent, mockTeacher, mockSession } from "@/utils/mock-data";
import type { SessionDoc } from "@/types";
import { isMockMode, setMockMode, seedMockData } from "@/utils/mock-db";

const SCROLL_KEY = "dev_page_scroll";

export default function DevPage() {
  const navigate = useNavigate();
  const setUser = useSetAtom(currentUserAtom);
  const setSession = useSetAtom(activeSessionAtom);
  const [mockOn, setMockOn] = useState(isMockMode());
  const [seeded, setSeeded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore scroll position on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved && scrollRef.current) {
      // Try the ref first, then the Page's scroll container
      const container = scrollRef.current.closest(".zaui-page") || scrollRef.current.parentElement;
      if (container) {
        requestAnimationFrame(() => container.scrollTop = parseInt(saved, 10));
      } else {
        requestAnimationFrame(() => window.scrollTo(0, parseInt(saved, 10)));
      }
    }
  }, []);

  // Save scroll position before navigating
  const saveScroll = useCallback(() => {
    const container = scrollRef.current?.closest(".zaui-page") || scrollRef.current?.parentElement;
    const scrollY = container ? container.scrollTop : window.scrollY;
    sessionStorage.setItem(SCROLL_KEY, String(scrollY));
  }, []);

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

  const goAs = (role: "student" | "teacher", path: string, sessionOverride?: SessionDoc) => {
    saveScroll();
    setUser(role === "student" ? mockStudent : mockTeacher);
    if (sessionOverride) {
      setSession(sessionOverride);
    } else if (path.includes("monitor") || path.includes("attendance/session")) {
      setSession(mockSession);
    }
    navigate(path);
  };

  const goTo = (path: string) => {
    saveScroll();
    navigate(path);
  };

  return (
    <Page className="page page-no-header" style={{ background: "#f2f2f7" }}>
      <div ref={scrollRef} style={{ background: "#ffffff", borderRadius: 12, padding: 16, marginBottom: 16, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>Dev Navigation</p>
        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>Nhay vao bat ky man hinh nao de test</p>
      </div>

      {/* Mock mode toggle */}
      <div style={{
        background: "#ffffff",
        borderRadius: 12,
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
        <Button
          variant={mockOn ? "secondary" : "primary"}
          fullWidth
          size="large"
          style={mockOn ? {} : { background: "#22c55e" }}
          onClick={mockOn ? disableMock : enableMock}
        >
          {mockOn ? "Tat Mock Mode" : "Bat Mock Mode + Tao du lieu"}
        </Button>
      </div>

      {/* Common */}
      <p className="section-label">Common</p>
      <div className="space-y-1.5 mb-4">
        <NavButton label="Splash" onClick={() => goTo("/splash")} />
        <NavButton label="Welcome" onClick={() => goTo("/welcome")} />
        <NavButton label="Login" onClick={() => goTo("/login")} />
      </div>

      {/* Student */}
      <p className="section-label">Student (Nguyen Van A)</p>
      <div className="space-y-1.5 mb-4">
        <NavButton label="Home (Student)" onClick={() => goAs("student", "/home")} />
        <NavButton label="Student Classes" onClick={() => goAs("student", "/student/classes")} />
        <NavButton label="Attendance Step 1 (QR)" onClick={() => goAs("student", "/student/attendance/session_step1", { id: "session_step1", classId: "class_001", className: "CNTT K68 - Lap trinh Web", teacherId: "teacher_001", status: "active" as const, hmacSecret: "test_step1_secret", qrRefreshInterval: 30, startedAt: Date.now() - 600000 })} desc="scan-teacher" />
        <NavButton label="Attendance Step 2 (Face)" onClick={() => goAs("student", "/student/attendance/session_step2", { id: "session_step2", classId: "class_001", className: "CNTT K68 - Lap trinh Web", teacherId: "teacher_001", status: "active" as const, hmacSecret: "test_step2_secret", qrRefreshInterval: 30, startedAt: Date.now() - 600000 })} desc="face-verify" />
        <NavButton label="Attendance Step 3 (Peer)" onClick={() => goAs("student", "/student/attendance/session_step3", { id: "session_step3", classId: "class_001", className: "CNTT K68 - Lap trinh Web", teacherId: "teacher_001", status: "active" as const, hmacSecret: "test_step3_secret", qrRefreshInterval: 30, startedAt: Date.now() - 600000 })} desc="show-qr + scan-peers" />
        <NavButton label="Attendance Step 4 (Done)" onClick={() => goAs("student", "/student/attendance/session_step4", { id: "session_step4", classId: "class_001", className: "CNTT K68 - Lap trinh Web", teacherId: "teacher_001", status: "active" as const, hmacSecret: "test_step4_secret", qrRefreshInterval: 30, startedAt: Date.now() - 600000 })} desc="done" />
        <NavButton label="Student History" onClick={() => goAs("student", "/student/history")} />
        <NavButton label="Face Register" onClick={() => goAs("student", "/student/face-register")} />
      </div>

      {/* Optional Steps */}
      <p className="section-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ background: "#a78bfa", width: 8, height: 8, borderRadius: 4, display: "inline-block" }} />
        Optional Steps (Student)
      </p>
      <div className="space-y-1.5 mb-4">
        <NavButton label="Face OFF, Peer ON (3 steps)" onClick={() => goAs("student", "/student/attendance/session_noface", { id: "session_noface", classId: "class_001", className: "CNTT K68 - Lap trinh Web", teacherId: "teacher_001", status: "active" as const, hmacSecret: "noface_secret", qrRefreshInterval: 30, faceRequired: false, peerRequired: true, startedAt: Date.now() - 600000 })} desc="QR → Peer → Done" />
        <NavButton label="Face ON, Peer OFF (3 steps)" onClick={() => goAs("student", "/student/attendance/session_nopeer", { id: "session_nopeer", classId: "class_001", className: "CNTT K68 - Lap trinh Web", teacherId: "teacher_001", status: "active" as const, hmacSecret: "nopeer_secret", qrRefreshInterval: 30, faceRequired: true, peerRequired: false, startedAt: Date.now() - 600000 })} desc="QR → Face → Done" />
        <NavButton label="Both OFF (2 steps)" onClick={() => goAs("student", "/student/attendance/session_qronly", { id: "session_qronly", classId: "class_001", className: "CNTT K68 - Lap trinh Web", teacherId: "teacher_001", status: "active" as const, hmacSecret: "qronly_secret", qrRefreshInterval: 30, faceRequired: false, peerRequired: false, startedAt: Date.now() - 600000 })} desc="QR → Done" />
        <NavButton label="Class Config (Toggle)" onClick={() => goAs("teacher", "/teacher/class/class_001")} desc="TeacherClassDetail toggles" />
      </div>

      {/* Manual Attendance */}
      <p className="section-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ background: "#22c55e", width: 8, height: 8, borderRadius: 4, display: "inline-block" }} />
        Manual Attendance (Teacher)
      </p>
      <div className="space-y-1.5 mb-4">
        <NavButton label="Monitor (Live, 4 SV vang)" onClick={() => goAs("teacher", "/teacher/monitor/session_active", { id: "session_active", classId: "class_001", className: "CNTT K68 - Lap trinh Web", teacherId: "teacher_001", status: "active" as const, hmacSecret: "active_secret", qrRefreshInterval: 30, startedAt: Date.now() - 1200000 })} desc="3/7 checked in, manual btn" />
        <NavButton label="Review (Co manual record)" onClick={() => goAs("teacher", "/teacher/review/session_manual")} desc="1 SV thu cong, 3 vang" />
        <NavButton label="Review (2 SV vang)" onClick={() => goAs("teacher", "/teacher/review/session_001")} desc="session_001, 5/7 SV" />
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
        borderRadius: 12,
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
