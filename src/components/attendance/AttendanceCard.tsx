import React from "react";
import { Box, Text } from "zmp-ui";
import TrustBadge from "./TrustBadge";
import FaceStatusBadge from "@/components/face/FaceStatusBadge";
import type { AttendanceDoc } from "@/types";

interface AttendanceCardProps {
  record: AttendanceDoc;
  showName?: boolean;
}

const avatarColors = ["bg-red-100 text-red-600", "bg-emerald-100 text-emerald-600", "bg-amber-100 text-amber-600", "bg-rose-100 text-rose-600", "bg-orange-100 text-orange-600"];

function getAvatarColor(name: string) {
  let h = 0;
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return avatarColors[Math.abs(h) % avatarColors.length];
}

export default function AttendanceCard({ record, showName = true }: AttendanceCardProps) {
  const time = new Date(record.checkedInAt).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });

  const score = record.teacherOverride
    ? (record.teacherOverride === "present" ? "present" as const : "absent" as const)
    : record.trustScore;

  return (
    <Box className="card-flat p-3 mb-2">
      <div className="flex items-center">
        {showName && (
          <div className={`avatar-circle ${getAvatarColor(record.studentName)} mr-3`}>
            {record.studentName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {showName && (
            <Text bold size="normal" className="truncate">{record.studentName}</Text>
          )}
          <div className="flex items-center flex-wrap gap-1 mt-0.5">
            <Text size="xxSmall" className="text-gray-400">{time}</Text>
            <span className="text-gray-300 text-xs mx-0.5">|</span>
            <Text size="xxSmall" className="text-gray-400">{record.peerCount} peer</Text>
            <FaceStatusBadge faceVerification={record.faceVerification} size="small" />
          </div>
        </div>
        <TrustBadge score={score} size="small" />
      </div>
    </Box>
  );
}
