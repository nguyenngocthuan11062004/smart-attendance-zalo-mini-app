import React, { useEffect, useState, useCallback } from "react";
import { Page, Box, Text, Header } from "zmp-ui";
import { useAtomValue, useSetAtom } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { globalErrorAtom } from "@/store/ui";
import { getStudentHistory } from "@/services/attendance.service";
import AttendanceCard from "@/components/attendance/AttendanceCard";
import PullToRefresh from "@/components/ui/PullToRefresh";
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

  return (
    <Page className="page">
      <Header title="Lịch sử điểm danh" showBackIcon={false} />

      <PullToRefresh onRefresh={async () => { setLoading(true); await loadHistory(); }}>
      {totalCount > 0 && (
        <div className="mb-4">
          {/* Main attendance rate */}
          <div className="card-flat p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <Text size="xSmall" className="text-gray-400">Tỷ lệ có mặt</Text>
                <Text bold size="xLarge" className="text-gray-800">
                  {Math.round((presentCount / totalCount) * 100)}%
                </Text>
              </div>
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: `conic-gradient(#ef4444 ${(presentCount / totalCount) * 360}deg, #f1f5f9 0deg)`,
                }}
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                  <Text bold size="small" className="text-red-600">{presentCount}/{totalCount}</Text>
                </div>
              </div>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="progress-fill h-full bg-red-500" style={{ width: `${(presentCount / totalCount) * 100}%` }} />
            </div>
          </div>

          {/* Stat cards row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="stat-card" style={{ background: "#f0fdf4", color: "#16a34a" }}>
              <p style={{ fontSize: 20, fontWeight: 700 }}>{presentCount}</p>
              <p style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>Có mặt</p>
            </div>
            <div className="stat-card" style={{ background: "#fef9c3", color: "#ca8a04" }}>
              <p style={{ fontSize: 20, fontWeight: 700 }}>{reviewCount}</p>
              <p style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>Xem xét</p>
            </div>
            <div className="stat-card" style={{ background: "#fee2e2", color: "#dc2626" }}>
              <p style={{ fontSize: 20, fontWeight: 700 }}>{absentCount}</p>
              <p style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>Vắng</p>
            </div>
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
        <Box className="text-center py-8">
          <Text className="text-gray-500">Chưa có lịch sử điểm danh</Text>
        </Box>
      ) : (
        records.map((r) => <AttendanceCard key={r.id} record={r} showName={false} />)
      )}
      </PullToRefresh>
    </Page>
  );
}
