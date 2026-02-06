import React, { useEffect, useState } from "react";
import { Page, Box, Text, Header } from "zmp-ui";
import { useParams } from "react-router-dom";
import { subscribeToSessionAttendance } from "@/services/attendance.service";
import { useSessionSubscription } from "@/hooks/useSession";
import { useAtomValue } from "jotai";
import { activeSessionAtom } from "@/store/session";
import AttendanceCard from "@/components/attendance/AttendanceCard";
import type { AttendanceDoc } from "@/types";

export default function TeacherMonitor() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const session = useAtomValue(activeSessionAtom);
  const [records, setRecords] = useState<AttendanceDoc[]>([]);

  useSessionSubscription(sessionId);

  useEffect(() => {
    if (!sessionId) return;
    const unsub = subscribeToSessionAttendance(sessionId, (recs) => {
      setRecords(recs.sort((a, b) => b.checkedInAt - a.checkedInAt));
    });
    return unsub;
  }, [sessionId]);

  const present = records.filter((r) => r.trustScore === "present").length;
  const review = records.filter((r) => r.trustScore === "review").length;
  const absent = records.filter((r) => r.trustScore === "absent").length;

  return (
    <Page className="page">
      <Header title="Theo dõi điểm danh" />

      <Box className="grid grid-cols-3 gap-2 mb-4">
        <StatCard label="Có mặt" value={present} color="text-green-600" bg="bg-green-50" />
        <StatCard label="Xem xét" value={review} color="text-yellow-600" bg="bg-yellow-50" />
        <StatCard label="Vắng" value={absent} color="text-red-600" bg="bg-red-50" />
      </Box>

      <Box className="flex justify-between items-center mb-3">
        <Text bold>Danh sách ({records.length})</Text>
        {session?.status === "active" && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
            Realtime
          </span>
        )}
      </Box>

      {records.length === 0 ? (
        <Box className="text-center py-8">
          <Text className="text-gray-500">Chưa có sinh viên điểm danh</Text>
        </Box>
      ) : (
        records.map((r) => <AttendanceCard key={r.id} record={r} />)
      )}
    </Page>
  );
}

function StatCard({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <Box className={`${bg} rounded-xl p-3 text-center`}>
      <Text size="xLarge" bold className={color}>
        {value}
      </Text>
      <Text size="xSmall" className="text-gray-600">
        {label}
      </Text>
    </Box>
  );
}
