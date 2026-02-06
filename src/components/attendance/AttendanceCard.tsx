import React from "react";
import { Box, Text } from "zmp-ui";
import TrustBadge from "./TrustBadge";
import type { AttendanceDoc } from "@/types";

interface AttendanceCardProps {
  record: AttendanceDoc;
  showName?: boolean;
}

export default function AttendanceCard({ record, showName = true }: AttendanceCardProps) {
  const time = new Date(record.checkedInAt).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });

  return (
    <Box className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm mb-2">
      <div className="flex-1">
        {showName && (
          <Text bold size="normal">
            {record.studentName}
          </Text>
        )}
        <Text size="xSmall" className="text-gray-500">
          {time} - {record.peerCount} peer(s)
        </Text>
      </div>
      <TrustBadge
        score={record.teacherOverride ? (record.teacherOverride === "present" ? "present" : "absent") : record.trustScore}
        size="small"
      />
    </Box>
  );
}
