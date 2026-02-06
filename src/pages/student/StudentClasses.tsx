import React, { useEffect, useState } from "react";
import { Page, Box, Button, Text, Input, Modal, Header } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { getStudentClasses, getClassByCode, joinClass } from "@/services/class.service";
import { getActiveSessionForClass } from "@/services/session.service";
import ClassCard from "@/components/class/ClassCard";
import type { ClassDoc } from "@/types";

export default function StudentClasses() {
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinModal, setJoinModal] = useState(false);
  const [classCode, setClassCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    getStudentClasses(user.id)
      .then(setClasses)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleJoinClass = async () => {
    if (!classCode.trim() || !user) return;
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
      setClasses((prev) => [...prev, { ...found, studentIds: [...found.studentIds, user.id] }]);
      setJoinModal(false);
      setClassCode("");
    } finally {
      setJoining(false);
    }
  };

  const handleClassClick = async (classDoc: ClassDoc) => {
    const session = await getActiveSessionForClass(classDoc.id);
    if (session) {
      navigate(`/student/attendance/${session.id}`);
    } else {
      // No active session - could show a snackbar/toast here
      alert("Chua co phien diem danh nao dang hoat dong");
    }
  };

  return (
    <Page className="page">
      <Header title="Lop hoc cua toi" showBackIcon={false} />

      <Box className="mb-4">
        <Button fullWidth variant="primary" onClick={() => setJoinModal(true)}>
          Tham gia lop moi
        </Button>
      </Box>

      {loading ? (
        <Text className="text-center text-gray-500">Dang tai...</Text>
      ) : classes.length === 0 ? (
        <Box className="text-center py-8">
          <Text className="text-gray-500">Chua tham gia lop nao</Text>
          <Text size="xSmall" className="text-gray-400">
            Nhan "Tham gia lop moi" de bat dau
          </Text>
        </Box>
      ) : (
        classes.map((c) => (
          <ClassCard key={c.id} classDoc={c} onClick={() => handleClassClick(c)} />
        ))
      )}

      <Modal visible={joinModal} onClose={() => setJoinModal(false)} title="Tham gia lop">
        <Box className="space-y-3 p-4">
          <Input
            label="Ma lop"
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
