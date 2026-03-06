import React, { useEffect, useState } from "react";
import { Page } from "zmp-ui";
import { useParams, useNavigate } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { activeSessionAtom } from "@/store/session";
import { globalErrorAtom } from "@/store/ui";
import { subscribeToSessionAttendance } from "@/services/attendance.service";
import { getSession, endSession } from "@/services/session.service";
import { getClassById } from "@/services/class.service";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/config/firebase";
import type { AttendanceDoc } from "@/types";

type FilterType = "all" | "present" | "review" | "absent";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  present: { label: "Có mặt", color: "#22c55e", bg: "#dcfce7" },
  review: { label: "Xem xét", color: "#f59e0b", bg: "#fef3c7" },
  absent: { label: "Vắng", color: "#ef4444", bg: "#fee2e2" },
};

export default function TeacherMonitor() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const session = useAtomValue(activeSessionAtom);
  const setActiveSession = useSetAtom(activeSessionAtom);
  const setError = useSetAtom(globalErrorAtom);
  const [records, setRecords] = useState<AttendanceDoc[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    getSession(sessionId).then((sess) => {
      if (sess) {
        getClassById(sess.classId).then((cls) => {
          if (cls) setTotalStudents(cls.studentIds.length);
        });
      }
    });

    const unsubscribe = subscribeToSessionAttendance(sessionId, (data) => {
      setRecords(data.sort((a, b) => b.checkedInAt - a.checkedInAt));
    });
    return () => unsubscribe();
  }, [sessionId]);

  const present = records.filter((r) => r.trustScore === "present").length;
  const review = records.filter((r) => r.trustScore === "review").length;
  const checkedIn = records.length;
  const absentCount = totalStudents > 0 ? totalStudents - checkedIn : 0;
  const progressPercent = totalStudents > 0 ? Math.round((checkedIn / totalStudents) * 100) : 0;

  const filteredRecords = records.filter((r) => {
    if (filter === "all") return true;
    if (filter === "present") return r.trustScore === "present";
    if (filter === "review") return r.trustScore === "review";
    if (filter === "absent") return r.trustScore === "absent";
    return true;
  });

  const handleEndSession = async () => {
    if (!sessionId) return;
    setEnding(true);
    try {
      await endSession(sessionId);
      const calculateTrustScores = httpsCallable(functions, "calculateTrustScores");
      await calculateTrustScores({ sessionId }).catch(() => {});
      setActiveSession(null);
      navigate(`/teacher/review/${sessionId}`);
    } catch {
      setError("Không thể kết thúc phiên. Vui lòng thử lại.");
    } finally {
      setEnding(false);
      setShowEndConfirm(false);
    }
  };

  const filterButtons: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "Tất cả", count: checkedIn },
    { key: "present", label: "Có mặt", count: present },
    { key: "review", label: "Xem xét", count: review },
    { key: "absent", label: "Vắng", count: records.filter((r) => r.trustScore === "absent").length },
  ];

  // SVG score ring arc
  const r = 27; const cx = 32; const cy = 32; const strokeW = 5;
  const sweep = (progressPercent / 100) * 360;
  const startRad = -Math.PI / 2;
  const endRad = startRad + (sweep * Math.PI) / 180;
  const largeArc = sweep > 180 ? 1 : 0;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const arcPath = sweep >= 360
    ? `M${cx},${cy - r} A${r},${r} 0 1,1 ${cx - 0.01},${cy - r}`
    : `M${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2}`;

  return (
    <Page style={{ background: "#f2f2f7", minHeight: "100vh", padding: 0 }}>
      {/* Header */}
      <div style={{
        background: "#be1d2c", borderRadius: "0 0 24px 24px",
        padding: "calc(var(--zaui-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 14px) 16px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button onClick={() => navigate(-1)} style={{
          background: "rgba(255,255,255,0.13)", border: "none",
          width: 36, height: 36, borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Theo dõi realtime</span>
        <button style={{
          background: "rgba(255,255,255,0.13)", border: "none",
          width: 36, height: 36, borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
        </button>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Progress card */}
        {totalStudents > 0 && (
          <div style={{
            background: "#ffffff", borderRadius: 16, padding: 20,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            border: "1px solid rgba(0,0,0,0.04)",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a" }}>
                {checkedIn}/{totalStudents} <span style={{ fontSize: 14, fontWeight: 500, color: "#6b7280" }}>SV</span>
              </span>
              {session?.status === "active" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: 4, background: "#22c55e",
                    boxShadow: "0 0 6px rgba(34,197,94,0.5)",
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#22c55e" }}>Realtime</span>
                </div>
              )}
            </div>

            {/* Score ring */}
            <div style={{ width: 64, height: 64, position: "relative", flexShrink: 0 }}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx={cx} cy={cy} r={r} stroke="#e5e5e5" strokeWidth={strokeW} fill="none" />
                {sweep > 0 && (
                  <path d={arcPath} stroke="#a78bfa" strokeWidth={strokeW} fill="none" strokeLinecap="round" />
                )}
              </svg>
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#a78bfa" }}>{progressPercent}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Stat cards row */}
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { value: present, label: "Có mặt", color: "#22c55e" },
            { value: review, label: "Xem xét", color: "#f59e0b" },
            { value: absentCount, label: "Vắng", color: "#ef4444" },
          ].map((s) => (
            <div key={s.label} style={{
              flex: 1, background: "#ffffff", borderRadius: 12,
              padding: "14px 10px", textAlign: "center",
              border: "1px solid rgba(0,0,0,0.04)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#6b7280" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Filter chips */}
        <div style={{ display: "flex", gap: 8 }}>
          {filterButtons.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                height: 32, borderRadius: 16,
                padding: "0 14px",
                background: filter === f.key ? "#1a1a1a" : "#ffffff",
                color: filter === f.key ? "#ffffff" : "#6b7280",
                fontSize: 13, fontWeight: 600,
                border: filter === f.key ? "none" : "1px solid rgba(0,0,0,0.08)",
                whiteSpace: "nowrap",
              }}
            >
              {f.label} {f.count}
            </button>
          ))}
        </div>

        {/* Attendance list */}
        {filteredRecords.length === 0 ? (
          <div style={{
            background: "#ffffff", borderRadius: 16, padding: 32,
            border: "1px solid rgba(0,0,0,0.04)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 28, background: "#f0f0f5",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>
              {filter === "all" ? "Chưa có sinh viên điểm danh" : "Không có sinh viên"}
            </p>
            <p style={{ fontSize: 13, color: "#9ca3af" }}>Dữ liệu sẽ cập nhật realtime</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredRecords.map((rec) => {
              const status = STATUS_CONFIG[rec.trustScore] || STATUS_CONFIG.absent;
              const name = rec.studentName || rec.studentId;
              const initial = name.charAt(0).toUpperCase();

              return (
                <div key={rec.id} style={{
                  background: "#ffffff", borderRadius: 12, padding: 14,
                  border: "1px solid rgba(0,0,0,0.04)",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 14, background: "#be1d2c",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <span style={{ color: "#ffffff", fontSize: 14, fontWeight: 700 }}>{initial}</span>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>{name}</span>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>{rec.peerCount} peers · {new Date(rec.checkedInAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>

                  {/* Status badge */}
                  <div style={{
                    background: status.bg, borderRadius: 8, padding: "4px 10px",
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: status.color }}>{status.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* End session button */}
        {session?.status === "active" && (
          <button
            onClick={() => setShowEndConfirm(true)}
            style={{
              width: "100%", height: 48, borderRadius: 12,
              background: "#be1d2c", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" />
            </svg>
            <span style={{ color: "#ffffff", fontSize: 15, fontWeight: 700 }}>Kết thúc phiên</span>
          </button>
        )}
      </div>

      {/* Confirm end modal */}
      {showEndConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }} onClick={() => setShowEndConfirm(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 420, background: "#ffffff",
              borderRadius: "20px 20px 0 0", padding: "24px 20px 32px",
              display: "flex", flexDirection: "column", gap: 16,
            }}
          >
            {/* Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#e5e7eb", margin: "0 auto" }} />

            <span style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", textAlign: "center" }}>Kết thúc phiên?</span>

            {/* Warning */}
            <div style={{
              background: "#fef3c7", borderRadius: 12, padding: 14,
              display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
              </svg>
              <span style={{ fontSize: 14, color: "#92400e", lineHeight: 1.5 }}>
                Đã có {checkedIn}/{totalStudents} sinh viên check-in. Hệ thống sẽ tính điểm tin cậy sau khi kết thúc.
              </span>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowEndConfirm(false)}
                style={{
                  flex: 1, height: 48, borderRadius: 12,
                  background: "#f2f2f7", border: "none",
                  fontSize: 15, fontWeight: 600, color: "#1a1a1a",
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleEndSession}
                disabled={ending}
                style={{
                  flex: 1, height: 48, borderRadius: 12,
                  background: ending ? "#d4d4d4" : "#ef4444", border: "none",
                  fontSize: 15, fontWeight: 600, color: "#ffffff",
                }}
              >
                {ending ? "Đang kết thúc..." : "Kết thúc"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
