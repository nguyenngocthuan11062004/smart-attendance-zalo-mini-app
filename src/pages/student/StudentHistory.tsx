import React, { useEffect, useState } from "react";
import { Page, Box, Text, Header } from "zmp-ui";
import { useAtomValue } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { getStudentHistory } from "@/services/attendance.service";
import AttendanceCard from "@/components/attendance/AttendanceCard";
import type { AttendanceDoc } from "@/types";

export default function StudentHistory() {
  const user = useAtomValue(currentUserAtom);
  const [records, setRecords] = useState<AttendanceDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getStudentHistory(user.id)
      .then((result) => {
        setRecords(result.sort((a, b) => b.checkedInAt - a.checkedInAt));
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const presentCount = records.filter((r) => r.trustScore === "present").length;
  const totalCount = records.length;

  return (
    <Page className="page">
      <Header title="Lịch sử điểm danh" showBackIcon={false} />

      {totalCount > 0 && (
        <Box className="bg-blue-50 rounded-xl p-4 mb-4">
          <Text size="xSmall" className="text-blue-600">
            Tổng kết
          </Text>
          <Text bold size="large" className="text-blue-800">
            {presentCount}/{totalCount} buổi có mặt
          </Text>
        </Box>
      )}

      {loading ? (
        <Text className="text-center text-gray-500">Đang tải...</Text>
      ) : records.length === 0 ? (
        <Box className="text-center py-8">
          <Text className="text-gray-500">Chưa có lịch sử điểm danh</Text>
        </Box>
      ) : (
        records.map((r) => <AttendanceCard key={r.id} record={r} showName={false} />)
      )}
    </Page>
  );
}
