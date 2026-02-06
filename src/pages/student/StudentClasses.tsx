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

  const loadClasses = async () => {
    if (!user) return;
    setLoading(true);
    const result = await getStudentClasses(user.id);
    setClasses(result);
    setLoading(false);
  };

  useEffect(() => {
    loadClasses();
  }, [user?.id]);

  const handleJoinClass = async () => {
    if (!user || !classCode.trim()) return;
    setJoining(true);
    setJoinError("");
    try {
      const classDoc = await getClassByCode(classCode.trim());
      if (!classDoc) {
        setJoinError("Không tìm thấy lớp với mã này");
        return;
      }
      if (classDoc.studentIds.includes(user.id)) {
        setJoinError("Bạn đã tham gia lớp này rồi");
        return;
      }
      await joinClass(classDoc.id, user.id);
      setJoinModal(false);
      setClassCode("");
      loadClasses();
    } catch {
      setJoinError("Có lỗi xảy ra");
    } finally {
      setJoining(false);
    }
  };

  const handleClassClick = async (classDoc: ClassDoc) => {
    const session = await getActiveSessionForClass(classDoc.id);
    if (session) {
      navigate(`/student/attendance/${session.id}`);
    }
  };

  return (
    <Page className="page">
      <Header title="Lớp học của tôi" showBackIcon={false} />

      <Box className="mb-4">
        <Button
          fullWidth
          variant="primary"
          onClick={() => setJoinModal(true)}
        >
          Tham gia lớp mới
        </Button>
      </Box>

      {loading ? (
        <Text className="text-center text-gray-500">Đang tải...</Text>
      ) : classes.length === 0 ? (
        <Box className="text-center py-8">
          <Text className="text-gray-500">Chưa tham gia lớp nào</Text>
          <Text size="xSmall" className="text-gray-400">
            Nhấn "Tham gia lớp mới" để bắt đầu
          </Text>
        </Box>
      ) : (
        classes.map((c) => (
          <ClassCard key={c.id} classDoc={c} onClick={() => handleClassClick(c)} />
        ))
      )}

      <Modal visible={joinModal} onClose={() => setJoinModal(false)} title="Tham gia lớp">
        <Box className="space-y-3 p-4">
          <Input
            label="Mã lớp"
            placeholder="Nhập mã lớp..."
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
