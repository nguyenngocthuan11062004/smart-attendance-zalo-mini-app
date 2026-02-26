import React, { useEffect, useState, useCallback } from "react";
import { Page, Box, Button, Text, Input, Header } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { getTeacherClasses, createClass } from "@/services/class.service";
import ClassCard from "@/components/class/ClassCard";
import PullToRefresh from "@/components/ui/PullToRefresh";
import DarkModal from "@/components/ui/DarkModal";
import type { ClassDoc } from "@/types";

export default function TeacherClasses() {
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [className, setClassName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadClasses = useCallback(async () => {
    if (!user?.id) return;
    try {
      const classList = await getTeacherClasses(user.id);
      setClasses(classList);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

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
    <Page className="page" style={{ background: "#f2f2f7" }}>
      <Header title="Quản lý lớp học" showBackIcon={false} />

      <PullToRefresh onRefresh={async () => { setLoading(true); await loadClasses(); }}>
      {/* Header card */}
      <div
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #f2f2f7 100%)",
          borderRadius: 20,
          padding: 16,
          marginBottom: 16,
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p style={{ color: "#9ca3af", fontSize: 12, fontWeight: 500 }}>Tổng số lớp</p>
            <p style={{ color: "#1a1a1a", fontSize: 30, fontWeight: 700, marginTop: 2 }}>
              {loading ? "..." : classes.length}
            </p>
          </div>
          <button
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              background: "rgba(0,0,0,0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
            }}
            onClick={() => setCreateModal(true)}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round">
              <path d="M11 4v14M4 11h14" />
            </svg>
          </button>
        </div>
      </div>

      <p className="section-label">Danh sách lớp học</p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 72 }} />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div className="empty-state">
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              background: "rgba(220,38,38,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
              <rect x="4" y="6" width="20" height="16" rx="3" />
              <path d="M9 6V4a2 2 0 012-2h6a2 2 0 012 2v2" />
            </svg>
          </div>
          <p style={{ color: "#1a1a1a", fontWeight: 600, marginBottom: 4 }}>Chưa có lớp học</p>
          <p style={{ color: "#9ca3af", fontSize: 12, marginBottom: 16 }}>Tạo lớp học đầu tiên để bắt đầu</p>
          <button className="btn-primary-dark" onClick={() => setCreateModal(true)}>
            Tạo lớp mới
          </button>
        </div>
      ) : (
        classes.map((c, i) => (
          <div key={c.id}>
            <ClassCard
              classDoc={c}
              showStudentCount
              onClick={() => navigate(`/teacher/class/${c.id}`)}
            />
          </div>
        ))
      )}
      </PullToRefresh>

      <DarkModal visible={createModal} onClose={() => setCreateModal(false)} title="Tạo lớp mới">
        <div style={{ padding: "0 4px" }}>
          <label style={{ display: "block", color: "#6b7280", fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
            Tên lớp
          </label>
          <input
            className="input-dark"
            placeholder="VD: CNTT K68..."
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            style={{ width: "100%", marginBottom: 16 }}
          />
          <button
            className="btn-primary-dark"
            style={{ width: "100%" }}
            disabled={creating}
            onClick={handleCreateClass}
          >
            {creating ? "Đang tạo..." : "Tạo lớp"}
          </button>
        </div>
      </DarkModal>
    </Page>
  );
}
