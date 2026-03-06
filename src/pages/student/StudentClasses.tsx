import React, { useEffect, useState } from "react";
import { Page, useSnackbar } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { getStudentClasses, getClassByCode, joinClass } from "@/services/class.service";
import { getActiveSessionForClass } from "@/services/session.service";
import PullToRefresh from "@/components/ui/PullToRefresh";
import DarkModal from "@/components/ui/DarkModal";
import { isValidClassCode } from "@/utils/sanitize";
import { scanQRCode, requestCameraPermission } from "zmp-sdk/apis";
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
      const session = await getActiveSessionForClass(found.id);
      if (session) {
        setActiveSessions((prev) => ({ ...prev, [found.id]: session }));
      }
    } finally {
      setJoining(false);
    }
  };

  const handleScanQR = async () => {
    if (!user) return;
    try {
      await requestCameraPermission({});
    } catch {
      openSnackbar({ type: "error", text: "Vui lòng cấp quyền camera để quét QR" });
      return;
    }
    try {
      const { content } = await scanQRCode({});
      if (!content) return;

      // QR có thể chứa mã lớp trực tiếp hoặc URL chứa mã lớp
      const code = content.trim();
      const found = await getClassByCode(code);
      if (!found) {
        openSnackbar({ type: "error", text: "Không tìm thấy lớp với mã QR này" });
        return;
      }
      if (classes.some((c) => c.id === found.id)) {
        openSnackbar({ type: "default", text: "Bạn đã tham gia lớp này rồi" });
        return;
      }
      await joinClass(found.id, user.id);
      const newClass = { ...found, studentIds: [...found.studentIds, user.id] };
      setClasses((prev) => [...prev, newClass]);
      openSnackbar({ type: "success", text: `Đã tham gia lớp ${found.name}` });
      const session = await getActiveSessionForClass(found.id);
      if (session) {
        setActiveSessions((prev) => ({ ...prev, [found.id]: session }));
      }
    } catch (err: any) {
      if (err.code === -201 || err.message?.includes("cancel")) return;
      openSnackbar({ type: "error", text: "Lỗi quét QR. Vui lòng thử lại." });
    }
  };

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
        <button style={{
          width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.13)",
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: "20px 16px" }}>
        <PullToRefresh onRefresh={async () => { setLoading(true); await loadClasses(); }}>
          {/* Join button */}
          <button
            onClick={() => setJoinModal(true)}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              background: "#be1d2c",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            <span style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>Tham gia lớp mới</span>
          </button>

          {/* Section label */}
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
              flex: 1, justifyContent: "center",
            }}>
              {/* Double circle icon */}
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
                Bạn chưa tham gia lớp học nào. Hãy nhập mã lớp hoặc quét QR để tham gia lớp học mới.
              </p>

              {/* Action buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", alignItems: "center" }}>
                <button
                  onClick={handleScanQR}
                  style={{
                    width: 260, height: 48, borderRadius: 12,
                    background: "#be1d2c", border: "none",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
                    <line x1="12" y1="3" x2="12" y2="21" />
                  </svg>
                  <span style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>Quét mã QR lớp</span>
                </button>
                <button
                  onClick={() => setJoinModal(true)}
                  style={{
                    width: 260, height: 48, borderRadius: 12,
                    background: "#f0f0f5", border: "none",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M6 16h12" />
                  </svg>
                  <span style={{ color: "#1a1a1a", fontSize: 15, fontWeight: 600 }}>Nhập mã lớp</span>
                </button>
              </div>

              {/* Hint */}
              <div style={{
                width: "100%", background: "#f0f0f5", borderRadius: 12, padding: 14,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                </svg>
                <span style={{ fontSize: 13, color: "#6b7280" }}>Liên hệ giảng viên để nhận mã lớp học</span>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {classes.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleClassClick(c)}
                  style={{
                    background: "#ffffff",
                    borderRadius: 14,
                    padding: 16,
                    border: "1px solid rgba(0,0,0,0.04)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    cursor: "pointer",
                  }}
                >
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#000000" }}>{c.name}</p>
                  <p style={{ fontSize: 12, fontFamily: "Roboto Mono, monospace", color: "#6b7280" }}>{c.code}</p>
                  <p style={{ fontSize: 13, color: "#6b7280" }}>GV: {c.teacherName}</p>
                  <p style={{ fontSize: 12, color: "#9ca3af" }}>{c.studentIds.length} sinh viên</p>
                  {activeSessions[c.id] && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/student/attendance/${activeSessions[c.id].id}`);
                      }}
                      style={{
                        width: "100%",
                        height: 36,
                        borderRadius: 10,
                        background: "#22c55e",
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>Điểm danh ngay</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </PullToRefresh>
      </div>

      {/* Join class modal */}
      <DarkModal visible={joinModal} onClose={() => setJoinModal(false)} title="Tham gia lớp">
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 4px" }}>
          <div>
            <label style={{ fontSize: 13, color: "#6b7280", marginBottom: 6, display: "block" }}>Mã lớp</label>
            <input
              placeholder="VD: WEB68A"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                background: "#f0f0f5",
                border: "1px solid rgba(0,0,0,0.08)",
                color: "#1a1a1a",
                fontSize: 15,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          {joinError && (
            <p style={{ color: "#ef4444", fontSize: 14 }}>{joinError}</p>
          )}
          <button
            onClick={handleJoinClass}
            disabled={joining}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              background: joining ? "#d4d4d4" : "#be1d2c",
              border: "none",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            {joining ? "Đang xử lý..." : "Tham gia"}
          </button>
        </div>
      </DarkModal>
    </Page>
  );
}
