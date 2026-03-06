import React, { useEffect, useState, useCallback } from "react";
import { Page, Spinner } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { getTeacherClasses, createClass } from "@/services/class.service";
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
    <Page style={{ background: "#f2f2f7", minHeight: "100vh", padding: 0 }}>
      {/* Header */}
      <div style={{
        background: "#be1d2c", borderRadius: "0 0 24px 24px",
        padding: "calc(var(--zaui-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 14px) 16px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button onClick={() => navigate(-1)} style={{
          width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.13)",
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Quan ly lop hoc</span>
        <button style={{
          width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.13)",
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
        </button>
      </div>

      <PullToRefresh onRefresh={async () => { setLoading(true); await loadClasses(); }}>
        <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Summary card */}
          <div style={{
            background: "#be1d2c", borderRadius: 16, padding: 20,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 500 }}>Tong so lop</span>
              <span style={{ color: "#fff", fontSize: 36, fontWeight: 800 }}>
                {loading ? "..." : classes.length}
              </span>
            </div>
            <button
              onClick={() => setCreateModal(true)}
              style={{
                width: 48, height: 48, borderRadius: 24,
                background: "rgba(255,255,255,0.19)", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          {/* Section label */}
          <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: 1 }}>LOP HOC</span>

          {/* Class list */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 90, borderRadius: 14 }} />
              ))}
            </div>
          ) : classes.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "40px 0" }}>
              <div style={{
                width: 64, height: 64, borderRadius: 32,
                background: "rgba(190,29,44,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round">
                  <rect x="4" y="6" width="16" height="12" rx="2" /><path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2" />
                </svg>
              </div>
              <p style={{ color: "#1a1a1a", fontWeight: 600 }}>Chua co lop hoc</p>
              <p style={{ color: "#9ca3af", fontSize: 12 }}>Tao lop hoc dau tien de bat dau</p>
              <button
                onClick={() => setCreateModal(true)}
                style={{
                  height: 44, borderRadius: 12, padding: "0 24px",
                  background: "#be1d2c", border: "none",
                  color: "#fff", fontSize: 14, fontWeight: 700,
                }}
              >
                Tao lop moi
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {classes.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/teacher/class/${c.id}`)}
                  style={{
                    background: "#ffffff", borderRadius: 14, padding: 16,
                    border: "1px solid rgba(0,0,0,0.04)",
                    display: "flex", flexDirection: "column", gap: 8,
                    textAlign: "left", width: "100%",
                  }}
                >
                  <span style={{ color: "#1a1a1a", fontSize: 15, fontWeight: 700 }}>{c.name}</span>
                  <span style={{ color: "#6b7280", fontSize: 12, fontWeight: 500 }}>{c.code}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                      </svg>
                      <span style={{ color: "#9ca3af", fontSize: 12 }}>{c.studentIds.length} sinh vien</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                      <span style={{ color: "#9ca3af", fontSize: 12 }}>-- phien</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* Create modal */}
      <DarkModal visible={createModal} onClose={() => setCreateModal(false)} title="Tao lop moi">
        <div style={{ padding: "0 4px" }}>
          <label style={{ display: "block", color: "#6b7280", fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
            Ten lop
          </label>
          <input
            className="input-dark"
            placeholder="VD: Lap trinh Web..."
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            style={{ width: "100%", marginBottom: 16 }}
          />
          <button
            disabled={creating || !className.trim()}
            onClick={handleCreateClass}
            style={{
              width: "100%", height: 48, borderRadius: 12,
              background: creating || !className.trim() ? "#d4d4d4" : "#be1d2c",
              border: "none", color: "#fff", fontSize: 15, fontWeight: 700,
            }}
          >
            {creating ? "Dang tao..." : "Tao lop"}
          </button>
        </div>
      </DarkModal>
    </Page>
  );
}
