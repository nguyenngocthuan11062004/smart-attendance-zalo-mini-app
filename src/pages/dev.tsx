import React from "react";
import { Page, Box, Button, Text } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useSetAtom } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { activeSessionAtom } from "@/store/session";
import { mockStudent, mockTeacher, mockSession } from "@/utils/mock-data";

export default function DevPage() {
  const navigate = useNavigate();
  const setUser = useSetAtom(currentUserAtom);
  const setSession = useSetAtom(activeSessionAtom);

  const goAs = (role: "student" | "teacher", path: string) => {
    setUser(role === "student" ? mockStudent : mockTeacher);
    if (path.includes("session") || path.includes("attendance") || path.includes("monitor") || path.includes("review")) {
      setSession(mockSession);
    }
    navigate(path);
  };

  return (
    <Page className="page">
      <Text.Title size="xLarge" className="mb-2">
        Dev Navigation
      </Text.Title>
      <Text size="small" className="text-gray-500 mb-6">
        Nhay vao bat ky man hinh nao de test
      </Text>

      {/* Common */}
      <SectionTitle title="Common" />
      <NavButton label="Splash" onClick={() => navigate("/splash")} />
      <NavButton label="Welcome" onClick={() => navigate("/welcome")} />
      <NavButton label="Login" onClick={() => navigate("/login")} />

      {/* Student */}
      <SectionTitle title="Student (Nguyen Van A)" />
      <NavButton label="Home (Student)" onClick={() => goAs("student", "/home")} />
      <NavButton label="Student Classes" onClick={() => goAs("student", "/student/classes")} />
      <NavButton label="Student Attendance (active session)" onClick={() => goAs("student", "/student/attendance/session_001")} />
      <NavButton label="Student History" onClick={() => goAs("student", "/student/history")} />

      {/* Teacher */}
      <SectionTitle title="Teacher (Tran Thi B)" />
      <NavButton label="Home (Teacher)" onClick={() => goAs("teacher", "/home")} />
      <NavButton label="Teacher Classes" onClick={() => goAs("teacher", "/teacher/classes")} />
      <NavButton label="Teacher Session (class_001)" onClick={() => goAs("teacher", "/teacher/session/class_001")} />
      <NavButton label="Teacher Monitor (session_001)" onClick={() => goAs("teacher", "/teacher/monitor/session_001")} />
      <NavButton label="Teacher Review (session_001)" onClick={() => goAs("teacher", "/teacher/review/session_001")} />
    </Page>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text bold size="large" className="mt-4 mb-2 text-blue-600">
      {title}
    </Text>
  );
}

function NavButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Box className="mb-2">
      <Button fullWidth variant="secondary" size="small" onClick={onClick}>
        {label}
      </Button>
    </Box>
  );
}
