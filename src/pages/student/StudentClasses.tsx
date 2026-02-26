import React, { useEffect, useState } from "react";
import { Page, Box, Text, Input, Header, useSnackbar } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { getStudentClasses, getClassByCode, joinClass } from "@/services/class.service";
import { getActiveSessionForClass } from "@/services/session.service";
import ClassCard from "@/components/class/ClassCard";
import PullToRefresh from "@/components/ui/PullToRefresh";
import DarkModal from "@/components/ui/DarkModal";
import { isValidClassCode } from "@/utils/sanitize";
import type { ClassDoc, SessionDoc } from "@/types";

export default function StudentClasses() {
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);
  const { openSnackbar } = useSnackbar();
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [activeSessions, setActiveSessions] = useState<Record<string, SessionDoc>>({});
  const [loading, setLoading] = useState(true);
  const [joinModal, setJoinModal] = useState(false);
  const [classCode, setClassCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadClasses();
  }, [user?.id]);

  async function loadClasses() {
    if (!user?.id) return;
    try {
      const classList = await getStudentClasses(user.id);
      setClasses(classList);
      // Check for active sessions for each class
      const sessionMap: Record<string, SessionDoc> = {};
      await Promise.all(
        classList.map(async (c) => {
          const session = await getActiveSessionForClass(c.id);
          if (session) sessionMap[c.id] = session;
        })
      );
      setActiveSessions(sessionMap);
    } finally {
      setLoading(false);
    }
  }

  const handleJoinClass = async () => {
    if (!classCode.trim() || !user) return;
    if (!isValidClassCode(classCode.trim())) {
      setJoinError("Ma lop khong hop le (2-10 ky tu chu/so)");
      return;
    }
    setJoining(true);
    setJoinError("");
    try {
      const found = await getClassByCode(classCode.trim());
      if (!found) {
        setJoinError("Khong tim thay lop voi ma nay");
        return;
      }
      if (classes.some((c) => c.id === found.id)) {
        setJoinError("Ban da tham gia lop nay roi");
        return;
      }
      await joinClass(found.id, user.id);
      const newClass = { ...found, studentIds: [...found.studentIds, user.id] };
      setClasses((prev) => [...prev, newClass]);
      setJoinModal(false);
      setClassCode("");
      openSnackbar({ type: "success", text: `Da tham gia lop ${found.name}` });
      // Check if new class has active session
      const session = await getActiveSessionForClass(found.id);
      if (session) {
        setActiveSessions((prev) => ({ ...prev, [found.id]: session }));
      }
    } finally {
      setJoining(false);
    }
  };

  const handleAttendance = (classId: string) => {
    const session = activeSessions[classId];
    if (session) {
      navigate(`/student/attendance/${session.id}`);
    }
  };

  const handleClassClick = async (classDoc: ClassDoc) => {
    // If there's a known active session, go directly to attendance
    const session = activeSessions[classDoc.id];
    if (session) {
      navigate(`/student/attendance/${session.id}`);
      return;
    }
    // Re-check in case session just started
    const freshSession = await getActiveSessionForClass(classDoc.id);
    if (freshSession) {
      setActiveSessions((prev) => ({ ...prev, [classDoc.id]: freshSession }));
      navigate(`/student/attendance/${freshSession.id}`);
    } else {
      openSnackbar({ type: "default", text: "Chua co phien diem danh nao dang hoat dong" });
    }
  };

  return (
    <Page className="page">
      <Header title="Lop hoc cua toi" showBackIcon={false} />

      <PullToRefresh onRefresh={async () => { setLoading(true); await loadClasses(); }}>
        <Box className="mb-4">
          <button
            onClick={() => setJoinModal(true)}
            className="btn-primary-dark"
            style={{
              width: "100%",
              padding: "14px 0",
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 14,
              background: "#be1d2c",
              color: "#fff",
              border: "none",
            }}
          >
            Tham gia lop moi
          </button>
        </Box>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-[72px]" />
            ))}
          </div>
        ) : classes.length === 0 ? (
          <Box className="text-center py-8">
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.6 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" style={{ margin: "0 auto" }}>
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
              </svg>
            </div>
            <Text style={{ color: "#9ca3af" }}>Chua tham gia lop nao</Text>
            <Text size="xSmall" style={{ color: "#6b7280", marginTop: 4 }}>
              Nhan "Tham gia lop moi" de bat dau
            </Text>
          </Box>
        ) : (
          classes.map((c, index) => (
            <div key={c.id} className="mb-3">
              <ClassCard classDoc={c} onClick={() => handleClassClick(c)} />
              {activeSessions[c.id] && (
                <div className="px-4 -mt-2 mb-1">
                  <button
                    style={{
                      width: "100%",
                      padding: "10px 0",
                      borderRadius: 12,
                      background: "#22c55e",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 600,
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAttendance(c.id);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mr-1.5">
                      <circle cx="8" cy="8" r="6" />
                      <path d="M5.5 8l1.5 1.5 3-3" />
                    </svg>
                    Diem danh ngay
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </PullToRefresh>

      <DarkModal visible={joinModal} onClose={() => setJoinModal(false)} title="Tham gia lop">
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 4px" }}>
          <div>
            <label style={{ fontSize: 13, color: "#6b7280", marginBottom: 6, display: "block" }}>Ma lop</label>
            <input
              className="input-dark"
              placeholder="VD: WEB68A"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                background: "#f0f0f5",
                border: "1px solid rgba(0,0,0,0.08)",
                color: "#1a1a1a",
                fontSize: 15,
                outline: "none",
              }}
            />
          </div>
          {joinError && (
            <Text size="small" style={{ color: "#ef4444" }}>
              {joinError}
            </Text>
          )}
          <button
            className="btn-primary-dark"
            onClick={handleJoinClass}
            disabled={joining}
            style={{
              width: "100%",
              padding: "14px 0",
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 14,
              background: "#be1d2c",
              color: "#fff",
              border: "none",
              opacity: joining ? 0.6 : 1,
            }}
          >
            {joining ? "Dang xu ly..." : "Tham gia"}
          </button>
        </div>
      </DarkModal>
    </Page>
  );
}
