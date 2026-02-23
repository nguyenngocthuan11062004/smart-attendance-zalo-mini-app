import React, { useEffect, useState } from "react";
import { Page, Box, Button, Text, Input, Modal, Header, useSnackbar } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { getStudentClasses, getClassByCode, joinClass } from "@/services/class.service";
import { getActiveSessionForClass } from "@/services/session.service";
import ClassCard from "@/components/class/ClassCard";
import PullToRefresh from "@/components/ui/PullToRefresh";
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
      setJoinError("Mã lớp không hợp lệ (2-10 ký tự chữ/số)");
      return;
    }
    setJoining(true);
    setJoinError("");
    try {
      const found = await getClassByCode(classCode.trim());
      if (!found) {
        setJoinError("Không tìm thấy lớp với mã này");
        return;
      }
      if (classes.some((c) => c.id === found.id)) {
        setJoinError("Bạn đã tham gia lớp này rồi");
        return;
      }
      await joinClass(found.id, user.id);
      const newClass = { ...found, studentIds: [...found.studentIds, user.id] };
      setClasses((prev) => [...prev, newClass]);
      setJoinModal(false);
      setClassCode("");
      openSnackbar({ type: "success", text: `Đã tham gia lớp ${found.name}` });
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
      openSnackbar({ type: "default", text: "Chưa có phiên điểm danh nào đang hoạt động" });
    }
  };

  return (
    <Page className="page">
      <Header title="Lớp học của tôi" showBackIcon={false} />

      <PullToRefresh onRefresh={async () => { setLoading(true); await loadClasses(); }}>
        <Box className="mb-4">
          <Button fullWidth variant="primary" onClick={() => setJoinModal(true)}>
            Tham gia lớp mới
          </Button>
        </Box>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-[72px]" />
            ))}
          </div>
        ) : classes.length === 0 ? (
          <Box className="text-center py-8">
            <Text className="text-gray-500">Chưa tham gia lớp nào</Text>
            <Text size="xSmall" className="text-gray-400">
              Nhấn "Tham gia lớp mới" để bắt đầu
            </Text>
          </Box>
        ) : (
          classes.map((c) => (
            <div key={c.id} className="mb-3">
              <ClassCard classDoc={c} onClick={() => handleClassClick(c)} />
              {activeSessions[c.id] && (
                <div className="px-4 -mt-2 mb-1">
                  <button
                    className="w-full py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold active:bg-emerald-600 flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAttendance(c.id);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mr-1.5">
                      <circle cx="8" cy="8" r="6" />
                      <path d="M5.5 8l1.5 1.5 3-3" />
                    </svg>
                    Điểm danh ngay
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </PullToRefresh>

      <Modal visible={joinModal} onClose={() => setJoinModal(false)} title="Tham gia lớp">
        <Box className="space-y-3 p-4">
          <Input
            label="Mã lớp"
            placeholder="VD: WEB68A"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
          />
          {joinError && (
            <Text size="small" className="text-red-500">
              {joinError}
            </Text>
          )}
          <Button fullWidth variant="primary" loading={joining} onClick={handleJoinClass}>
            Tham gia
          </Button>
        </Box>
      </Modal>
    </Page>
  );
}
