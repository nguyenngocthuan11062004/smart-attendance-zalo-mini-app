import React, { useEffect, useState, useCallback } from "react";
import { Page } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { globalErrorAtom } from "@/store/ui";
import { getStudentHistory } from "@/services/attendance.service";
import PullToRefresh from "@/components/ui/PullToRefresh";
import type { AttendanceDoc } from "@/types";

function getEffectiveScore(r: AttendanceDoc): string {
  if (r.teacherOverride) return r.teacherOverride;
  return r.trustScore;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  present: { label: "Có mặt", color: "#22c55e", bg: "#dcfce7" },
  review: { label: "Xem xét", color: "#f59e0b", bg: "#fef3c7" },
  absent: { label: "Vắng", color: "#ef4444", bg: "#fee2e2" },
};

export default function StudentHistory() {
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);
  const setError = useSetAtom(globalErrorAtom);
  const [records, setRecords] = useState<AttendanceDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getStudentHistory(user.id);
      setRecords(data.sort((a, b) => b.checkedInAt - a.checkedInAt));
    } catch {
      setError("Không thể tải lịch sử điểm danh");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const presentCount = records.filter((r) => getEffectiveScore(r) === "present").length;
  const totalCount = records.length;
  const reviewCount = records.filter((r) => getEffectiveScore(r) === "review").length;
  const absentCount = totalCount - presentCount - reviewCount;
  const attendancePercent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  // SVG score ring arc
  const r = 27; const cx = 32; const cy = 32; const strokeW = 5;
  const sweep = (attendancePercent / 100) * 360;
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
          width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.13)",
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Lịch sử điểm danh</span>
        <button style={{
          width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.13)",
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
        </button>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        <PullToRefresh onRefresh={async () => { setLoading(true); await loadHistory(); }}>

          {/* Score card */}
          {totalCount > 0 && (
            <div style={{
              background: "#ffffff", borderRadius: 16, padding: 20,
              display: "flex", alignItems: "center", gap: 16, marginBottom: 16,
            }}>
              {/* Score ring */}
              <div style={{ width: 64, height: 64, position: "relative", flexShrink: 0 }}>
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <circle cx={cx} cy={cy} r={r} stroke="#e5e5e5" strokeWidth={strokeW} fill="none" />
                  {sweep > 0 && (
                    <path d={arcPath} stroke="#be1d2c" strokeWidth={strokeW} fill="none" strokeLinecap="round" />
                  )}
                </svg>
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#be1d2c" }}>{attendancePercent}%</span>
                </div>
              </div>

              {/* Right side */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>Tỷ lệ có mặt</span>
                <div style={{ width: "100%", height: 6, borderRadius: 3, background: "#e5e5e5" }}>
                  <div style={{ width: `${attendancePercent}%`, height: 6, borderRadius: 3, background: "#be1d2c" }} />
                </div>
              </div>
            </div>
          )}

          {/* Stat cards row */}
          {totalCount > 0 && (
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              {[
                { value: presentCount, label: "Có mặt", color: "#22c55e" },
                { value: reviewCount, label: "Xem xét", color: "#f59e0b" },
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
          )}

          {/* Section label */}
          <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: 1, marginBottom: 0 }}>LỊCH SỬ</span>

          {/* Loading skeleton */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: 72, borderRadius: 12, background: "#e5e7eb", animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
              ))}
            </div>
          ) : records.length === 0 ? (
            /* Empty state */
            <div style={{
              background: "#ffffff", borderRadius: 16, padding: 32, marginTop: 12,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
              border: "1px solid rgba(0,0,0,0.04)",
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 28, background: "#f0f0f5",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>Chưa có lịch sử điểm danh</p>
              <p style={{ fontSize: 13, color: "#9ca3af" }}>Dữ liệu sẽ xuất hiện sau khi điểm danh</p>
            </div>
          ) : (
            /* Attendance cards */
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
              {records.map((r) => {
                const score = getEffectiveScore(r);
                const status = STATUS_CONFIG[score] || STATUS_CONFIG.absent;
                const faceOk = r.faceVerification?.matched;
                const faceColor = faceOk ? "#22c55e" : score === "review" ? "#f59e0b" : "#ef4444";

                return (
                  <div key={r.id} style={{
                    background: "#ffffff", borderRadius: 12, padding: 14,
                    display: "flex", flexDirection: "column", gap: 8,
                  }}>
                    {/* Top row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>{r.className || r.classId}</span>
                      <div style={{
                        background: status.bg, borderRadius: 8, padding: "2px 8px",
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: status.color }}>{status.label}</span>
                      </div>
                    </div>
                    {/* Bottom row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                        {new Date(r.checkedInAt).toLocaleDateString("vi-VN")}
                      </span>
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>
                        {r.peerCount} peers
                      </span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={faceColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="8" r="4" /><path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PullToRefresh>
      </div>
    </Page>
  );
}
