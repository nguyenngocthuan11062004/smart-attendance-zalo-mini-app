import React, { useEffect, useState } from "react";
import { Page, Box, Text, Button, Header } from "zmp-ui";
import { useParams } from "react-router-dom";
import { mockAttendanceRecords } from "@/utils/mock-data";
import TrustBadge from "@/components/attendance/TrustBadge";
import type { AttendanceDoc } from "@/types";

export default function TeacherReview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [records, setRecords] = useState<AttendanceDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setRecords(mockAttendanceRecords.sort((a, b) => a.peerCount - b.peerCount));
      setLoading(false);
    }, 300);
  }, [sessionId]);

  const handleOverride = (attendanceId: string, decision: "present" | "absent") => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === attendanceId
          ? { ...r, teacherOverride: decision, trustScore: decision === "present" ? "present" : "absent" }
          : r
      )
    );
  };

  const borderlineCases = records.filter(
    (r) => r.trustScore === "review" && !r.teacherOverride
  );

  return (
    <Page className="page">
      <Header title="Xem xet diem danh" />

      {borderlineCases.length > 0 && (
        <>
          <Text bold size="large" className="mb-3">
            Can xem xet ({borderlineCases.length})
          </Text>
          {borderlineCases.map((r) => (
            <ReviewCard key={r.id} record={r} onOverride={handleOverride} />
          ))}
          <Box className="border-t border-gray-200 my-4" />
        </>
      )}

      <Text bold size="large" className="mb-3">
        Tat ca ({records.length})
      </Text>
      {loading ? (
        <Text className="text-center text-gray-500">Dang tai...</Text>
      ) : records.length === 0 ? (
        <Box className="text-center py-8">
          <Text className="text-gray-500">Khong co du lieu</Text>
        </Box>
      ) : (
        records.map((r) => (
          <Box
            key={r.id}
            className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm mb-2"
          >
            <div>
              <Text bold>{r.studentName}</Text>
              <Text size="xSmall" className="text-gray-500">
                {r.peerCount} peer(s)
              </Text>
            </div>
            <TrustBadge
              score={r.teacherOverride ? (r.teacherOverride === "present" ? "present" : "absent") : r.trustScore}
              size="small"
            />
          </Box>
        ))
      )}
    </Page>
  );
}

function ReviewCard({
  record,
  onOverride,
}: {
  record: AttendanceDoc;
  onOverride: (id: string, decision: "present" | "absent") => void;
}) {
  return (
    <Box className="p-4 bg-yellow-50 rounded-xl mb-3">
      <div className="flex items-center justify-between mb-2">
        <Text bold>{record.studentName}</Text>
        <TrustBadge score="review" size="small" />
      </div>
      <Text size="xSmall" className="text-gray-600 mb-3">
        {record.peerCount} xac minh ngang hang | Check-in:{" "}
        {new Date(record.checkedInAt).toLocaleTimeString("vi-VN")}
      </Text>
      <div className="flex space-x-2">
        <Button
          size="small"
          variant="primary"
          className="flex-1"
          onClick={() => onOverride(record.id, "present")}
        >
          Co mat
        </Button>
        <Button
          size="small"
          variant="secondary"
          className="flex-1"
          type="danger"
          onClick={() => onOverride(record.id, "absent")}
        >
          Vang
        </Button>
      </div>
    </Box>
  );
}
