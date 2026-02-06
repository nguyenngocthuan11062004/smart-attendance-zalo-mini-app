import React, { useEffect, useState } from "react";
import { Page, Box, Button, Text, Input, Modal, Header } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { mockClasses } from "@/utils/mock-data";
import ClassCard from "@/components/class/ClassCard";
import type { ClassDoc } from "@/types";

export default function TeacherClasses() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [className, setClassName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setClasses(mockClasses);
      setLoading(false);
    }, 300);
  }, []);

  const handleCreateClass = () => {
    if (!className.trim()) return;
    setCreating(true);
    setTimeout(() => {
      const newClass: ClassDoc = {
        id: `class_${Date.now()}`,
        name: className.trim(),
        code: Math.random().toString(36).substring(2, 8).toUpperCase(),
        teacherId: "teacher_001",
        teacherName: "Tran Thi B",
        studentIds: [],
        createdAt: Date.now(),
      };
      setClasses((prev) => [newClass, ...prev]);
      setCreateModal(false);
      setClassName("");
      setCreating(false);
    }, 500);
  };

  return (
    <Page className="page">
      <Header title="Quan ly lop hoc" showBackIcon={false} />

      <Box className="mb-4">
        <Button fullWidth variant="primary" onClick={() => setCreateModal(true)}>
          Tao lop moi
        </Button>
      </Box>

      {loading ? (
        <Text className="text-center text-gray-500">Dang tai...</Text>
      ) : classes.length === 0 ? (
        <Box className="text-center py-8">
          <Text className="text-gray-500">Chua co lop hoc nao</Text>
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

      <Modal visible={createModal} onClose={() => setCreateModal(false)} title="Tao lop moi">
        <Box className="space-y-3 p-4">
          <Input
            label="Ten lop"
            placeholder="VD: CNTT K68..."
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          />
          <Button fullWidth variant="primary" loading={creating} onClick={handleCreateClass}>
            Tao lop
          </Button>
        </Box>
      </Modal>
    </Page>
  );
}
