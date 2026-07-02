import React, { useEffect, useState, useCallback } from "react";
import { Page } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { subscribeTeacherClasses } from "@/services/class.service";
import PullToRefresh from "@/components/ui/PullToRefresh";
import type { ClassDoc } from "@/types";

export default function TeacherClasses() {
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Realtime: lớp GV đang dạy — tạo lớp mới (kể cả từ admin) hiện ngay
  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    const unsub = subscribeTeacherClasses(user.id, (classList) => {
      setClasses(classList);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.id]);

  // Giữ cho PullToRefresh — dữ liệu đã realtime nên chỉ là no-op
  const loadClasses = useCallback(async () => {}, []);

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
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Lớp học của tôi</span>
        <div style={{ width: 36 }} />
      </div>

      <PullToRefresh onRefresh={async () => { setLoading(true); await loadClasses(); }}>
        <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Summary card */}
          <div style={{
            background: "#be1d2c", borderRadius: 16, padding: 20,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 500 }}>Tổng số lớp</span>
              <span style={{ color: "#fff", fontSize: 36, fontWeight: 800 }}>
                {loading ? "..." : classes.length}
              </span>
            </div>
            <div style={{
              width: 48, height: 48, borderRadius: 24,
              background: "rgba(255,255,255,0.19)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <rect x="4" y="6" width="16" height="12" rx="2" /><path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2" />
              </svg>
            </div>
          </div>

          {/* Section label */}
          <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: 1 }}>LỚP HỌC</span>

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
              <p style={{ color: "#1a1a1a", fontWeight: 600 }}>Chưa có lớp học</p>
              <p style={{ color: "#9ca3af", fontSize: 12, textAlign: "center", lineHeight: 1.5 }}>
                Lớp học được tạo bởi Phòng Đào tạo.<br />
                Liên hệ admin nếu cần được thêm vào lớp.
              </p>
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
                      <span style={{ color: "#9ca3af", fontSize: 12 }}>{c.rosterMssv?.length ?? c.studentIds.length} sinh viên</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Info note */}
          <div style={{
            background: "#eff6ff", borderRadius: 12, padding: 14,
            border: "1px solid rgba(59,130,246,0.15)",
            display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
            </svg>
            <span style={{ fontSize: 12, color: "#1e40af", lineHeight: 1.5 }}>
              Lớp học được tạo và quản lý bởi Phòng Đào tạo qua trang quản trị. Giảng viên được phân công vào lớp sẽ thấy lớp ở đây.
            </span>
          </div>
        </div>
      </PullToRefresh>
    </Page>
  );
}
