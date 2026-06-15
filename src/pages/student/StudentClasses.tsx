import { useEffect, useState } from "react";
import { Page, useSnackbar } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { getStudentClasses } from "@/services/class.service";
import { getActiveSessionForClass } from "@/services/session.service";
import PullToRefresh from "@/components/ui/PullToRefresh";
import type { ClassDoc, SessionDoc } from "@/types";

export default function StudentClasses() {
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);
  const { openSnackbar } = useSnackbar();
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [activeSessions, setActiveSessions] = useState<Record<string, SessionDoc>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    loadClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.mssv]);

  async function loadClasses() {
    try {
      const classList = await getStudentClasses(user?.mssv || "");
      setClasses(classList);
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

  const handleClassClick = async (classDoc: ClassDoc) => {
    const session = activeSessions[classDoc.id];
    if (session) {
      navigate(`/student/attendance/${session.id}`);
      return;
    }
    const freshSession = await getActiveSessionForClass(classDoc.id);
    if (freshSession) {
      setActiveSessions((prev) => ({ ...prev, [classDoc.id]: freshSession }));
      navigate(`/student/attendance/${freshSession.id}`);
    } else {
      openSnackbar({ type: "default", text: "Chưa có phiên điểm danh nào đang hoạt động" });
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
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Lớp học của tôi</span>
        <div style={{ width: 36 }} />
      </div>

      {/* Content */}
      <div style={{ padding: "20px 16px" }}>
        <PullToRefresh onRefresh={async () => { setLoading(true); await loadClasses(); }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
            LỚP HỌC
          </p>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: 120, borderRadius: 14, background: "#e5e7eb", animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
              ))}
            </div>
          ) : classes.length === 0 ? (
            <div style={{
              background: "#ffffff", borderRadius: 20, padding: 32,
              border: "1px solid rgba(0,0,0,0.04)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
            }}>
              <div style={{
                width: 100, height: 100, borderRadius: 50,
                background: "rgba(190,29,44,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 36,
                  background: "rgba(190,29,44,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                  </svg>
                </div>
              </div>

              <p style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", textAlign: "center" }}>Chưa có lớp học nào</p>
              <p style={{ fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 1.5, maxWidth: 280 }}>
                Lớp sẽ <strong>tự động hiện</strong> khi giảng viên thêm MSSV <strong>{user?.mssv || "của bạn"}</strong> vào danh sách lớp.
              </p>

              <div style={{
                width: "100%", background: "#f0f0f5", borderRadius: 12, padding: 14,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                </svg>
                <span style={{ fontSize: 13, color: "#6b7280" }}>Liên hệ giảng viên nếu chưa thấy lớp của bạn (kéo xuống để làm mới).</span>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {classes.map((c) => {
                const session = activeSessions[c.id];
                const count = c.rosterMssv?.length ?? c.studentIds.length;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleClassClick(c)}
                    style={{
                      background: "#fce8e8", borderRadius: 16, padding: "18px 16px",
                      display: "flex", alignItems: "center", gap: 16,
                      border: "none", textAlign: "left", width: "100%",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      {session ? (
                        <>
                          <div style={{ width: 10, height: 10, borderRadius: 5, background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.4)" }} />
                          <div style={{ width: 2, height: 20, borderRadius: 1, background: "#d1d5db" }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#22c55e" }}>LIVE</span>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>{c.code}</span>
                          <div style={{ width: 2, height: 20, borderRadius: 1, background: "#d1d5db" }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af" }}>{count} SV</span>
                        </>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                      <span className="truncate" style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{c.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: 3, background: "#be1d2c", flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#6b7280" }}>GV: {c.teacherName}</span>
                      </div>
                      {session && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: 3, background: "#3b82f6", flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#3b82f6" }}>Phiên điểm danh đang mở</span>
                        </div>
                      )}
                    </div>

                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                );
              })}
            </div>
          )}
        </PullToRefresh>
      </div>
    </Page>
  );
}
