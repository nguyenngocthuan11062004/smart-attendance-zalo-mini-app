import React, { useEffect, useState, useCallback } from "react";
import { Page, Box, Text, Header } from "zmp-ui";
import { useAtomValue, useSetAtom } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { globalErrorAtom } from "@/store/ui";
import { getStudentHistory } from "@/services/attendance.service";
import AttendanceCard from "@/components/attendance/AttendanceCard";
import PullToRefresh from "@/components/ui/PullToRefresh";
import ScoreRing from "@/components/ui/ScoreRing";
import DarkStatCard from "@/components/ui/DarkStatCard";
import DarkProgressBar from "@/components/ui/DarkProgressBar";
import type { AttendanceDoc } from "@/types";

function getEffectiveScore(r: AttendanceDoc): string {
  if (r.teacherOverride) return r.teacherOverride;
  return r.trustScore;
}

export default function StudentHistory() {
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
      setError("Khong the tai lich su diem danh");
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

  return (
    <Page className="page">
      <Header title="Lich su diem danh" showBackIcon={false} />

      <PullToRefresh onRefresh={async () => { setLoading(true); await loadHistory(); }}>
      {totalCount > 0 && (
        <div className="mb-4">
          {/* Main attendance rate */}
          <div className="card-flat animate-stagger-1" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <Text size="xSmall" style={{ color: "#6b7280" }}>Ty le co mat</Text>
                <Text bold size="xLarge" style={{ color: "#1a1a1a" }}>
                  {attendancePercent}%
                </Text>
              </div>
              <ScoreRing percentage={attendancePercent} size={64} color="#be1d2c" glow animated>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#be1d2c" }}>
                  {presentCount}/{totalCount}
                </span>
              </ScoreRing>
            </div>
            <DarkProgressBar percentage={attendancePercent} color="#be1d2c" />
          </div>

          {/* Stat cards row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="animate-stagger-2"><DarkStatCard value={presentCount} label="Co mat" color="#22c55e" enhanced /></div>
            <div className="animate-stagger-3"><DarkStatCard value={reviewCount} label="Xem xet" color="#f59e0b" enhanced /></div>
            <div className="animate-stagger-4"><DarkStatCard value={absentCount} label="Vang" color="#be1d2c" enhanced /></div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-[56px]" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="empty-state-dark" style={{ padding: "32px 0", textAlign: "center" }}>
          <div className="animate-float" style={{ marginBottom: 12 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" style={{ margin: "0 auto" }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <Text style={{ color: "#9ca3af" }}>Chua co lich su diem danh</Text>
        </div>
      ) : (
        records.map((r, index) => (
          <div key={r.id} className={`animate-stagger-${Math.min(index + 1, 10)}`}>
            <AttendanceCard record={r} showName={false} index={index} />
          </div>
        ))
      )}
      </PullToRefresh>
    </Page>
  );
}
