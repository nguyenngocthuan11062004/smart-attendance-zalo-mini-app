import React, { useEffect, useState } from "react";
import { Page, Box, Button, Text, Input, Modal, Header } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { getTeacherClasses, createClass } from "@/services/class.service";
import ClassCard from "@/components/class/ClassCard";
import type { ClassDoc } from "@/types";

export default function TeacherClasses() {
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [className, setClassName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadClasses = async () => {
    if (!user) return;
    setLoading(true);
    const result = await getTeacherClasses(user.id);
    setClasses(result);
    setLoading(false);
  };

  useEffect(() => {
    loadClasses();
  }, [user?.id]);

  const handleCreateClass = async () => {
    if (!user || !className.trim()) return;
    setCreating(true);
    try {
      await createClass(user.id, user.name, className.trim());
      setCreateModal(false);
      setClassName("");
      loadClasses();
    } finally {
      setCreating(false);
    }
  };

  return (
    <Page className="page">
      <Header title="Quản lý lớp học" showBackIcon={false} />

      <Box className="mb-4">
        <Button fullWidth variant="primary" onClick={() => setCreateModal(true)}>
          Tạo lớp mới
        </Button>
      </Box>

      {loading ? (
        <Text className="text-center text-gray-500">Đang tải...</Text>
      ) : classes.length === 0 ? (
        <Box className="text-center py-8">
          <Text className="text-gray-500">Chưa có lớp học nào</Text>
        </Box>
      ) : (
        classes.map((c) => (
          <ClassCard
            key={c.id}
            classDoc={c}
            showStudentCount
            onClick={() => navigate(`/teacher/session/${c.id}`)}
          />
        ))
      )}

      <Modal visible={createModal} onClose={() => setCreateModal(false)} title="Tạo lớp mới">
        <Box className="space-y-3 p-4">
          <Input
            label="Tên lớp"
            placeholder="VD: CNTT K68..."
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          />
          <Button fullWidth variant="primary" loading={creating} onClick={handleCreateClass}>
            Tạo lớp
          </Button>
        </Box>
      </Modal>
    </Page>
  );
}
