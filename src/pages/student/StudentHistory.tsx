import React, { useEffect, useState } from "react";
import { Page, Box, Text, Header } from "zmp-ui";
import { mockStudentHistory } from "@/utils/mock-data";
import AttendanceCard from "@/components/attendance/AttendanceCard";
import type { AttendanceDoc } from "@/types";

export default function StudentHistory() {
  const [records, setRecords] = useState<AttendanceDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setRecords(mockStudentHistory.sort((a, b) => b.checkedInAt - a.checkedInAt));
      setLoading(false);
    }, 300);
  }, []);

  const presentCount = records.filter((r) => r.trustScore === "present").length;
  const totalCount = records.length;

  return (
    <Page className="page">
      <Header title="Lich su diem danh" showBackIcon={false} />

      {totalCount > 0 && (
        <Box className="bg-blue-50 rounded-xl p-4 mb-4">
          <Text size="xSmall" className="text-blue-600">
            Tong ket
          </Text>
          <Text bold size="large" className="text-blue-800">
            {presentCount}/{totalCount} buoi co mat
          </Text>
        </Box>
      )}

      {loading ? (
        <Text className="text-center text-gray-500">Dang tai...</Text>
      ) : records.length === 0 ? (
        <Box className="text-center py-8">
          <Text className="text-gray-500">Chua co lich su diem danh</Text>
        </Box>
      ) : (
        records.map((r) => <AttendanceCard key={r.id} record={r} showName={false} />)
      )}
    </Page>
  );
}
