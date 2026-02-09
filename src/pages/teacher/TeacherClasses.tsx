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

  useEffect(() => {
    if (!user?.id) return;
    getTeacherClasses(user.id)
      .then(setClasses)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleCreateClass = async () => {
    if (!className.trim() || !user) return;
    setCreating(true);
    try {
      const newClass = await createClass(user.id, user.name, className.trim());
      setClasses((prev) => [newClass, ...prev]);
      setCreateModal(false);
      setClassName("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Page className="page">
      <Header title="Quan ly lop hoc" showBackIcon={false} />

      {/* Header card with gradient */}
      <div className="gradient-blue rounded-2xl p-4 mb-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-xs font-medium">Tong so lop</p>
            <p className="text-3xl font-bold mt-0.5">{loading ? "..." : classes.length}</p>
          </div>
          <button
            className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center active:bg-white/30"
            onClick={() => setCreateModal(true)}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M11 4v14M4 11h14" />
            </svg>
          </button>
        </div>
      </div>

      <p className="section-label">Danh sach lop hoc</p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-[72px]" />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div className="empty-state">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-3">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round">
              <rect x="4" y="6" width="20" height="16" rx="3" />
              <path d="M9 6V4a2 2 0 012-2h6a2 2 0 012 2v2" />
            </svg>
          </div>
          <Text bold className="text-gray-600 mb-1">Chua co lop hoc</Text>
          <Text size="xSmall" className="text-gray-400 mb-4">Tao lop hoc dau tien de bat dau</Text>
          <Button size="small" variant="primary" onClick={() => setCreateModal(true)}>
            Tao lop moi
          </Button>
        </div>
      ) : (
        classes.map((c) => (
          <ClassCard
            key={c.id}
            classDoc={c}
            showStudentCount
            onClick={() => navigate(`/teacher/class/${c.id}`)}
          />
        ))
      )}

      <Modal visible={createModal} onClose={() => setCreateModal(false)} title="Tao lop moi">
        <Box className="p-4">
          <Input
            label="Ten lop"
            placeholder="VD: CNTT K68..."
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          />
          <div className="mt-4">
            <Button fullWidth variant="primary" loading={creating} onClick={handleCreateClass}>
              Tao lop
            </Button>
          </div>
        </Box>
      </Modal>
    </Page>
  );
}
