import React from "react";
import { Box, Text } from "zmp-ui";
import TrustBadge from "./TrustBadge";
import FaceStatusBadge from "@/components/face/FaceStatusBadge";
import type { AttendanceDoc } from "@/types";

interface AttendanceCardProps {
  record: AttendanceDoc;
  showName?: boolean;
  index?: number;
}

const avatarColors = [
  { bg: "rgba(220,38,38,0.15)", text: "#ef4444" },
  { bg: "rgba(34,197,94,0.15)", text: "#22c55e" },
  { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
  { bg: "rgba(167,139,250,0.15)", text: "#a78bfa" },
  { bg: "rgba(236,72,153,0.15)", text: "#ec4899" },
];

function getAvatarColor(name: string) {
  let h = 0;
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return avatarColors[Math.abs(h) % avatarColors.length];
}

const statusGlow: Record<string, string> = {
  present: "0 0 12px rgba(34,197,94,0.2)",
  review: "0 0 12px rgba(245,158,11,0.2)",
  absent: "0 0 12px rgba(239,68,68,0.2)",
};

export default function AttendanceCard({ record, showName = true, index }: AttendanceCardProps) {
  const time = new Date(record.checkedInAt).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });

  const score = record.teacherOverride
    ? (record.teacherOverride === "present" ? "present" as const : "absent" as const)
    : record.trustScore;

  const avatarColor = getAvatarColor(record.studentName);
  const staggerClass = index !== undefined ? `animate-stagger-${Math.min(index + 1, 10)}` : "";
  const scoreKey = typeof score === "number" ? (score >= 80 ? "present" : score >= 50 ? "review" : "absent") : score;
  const glowShadow = statusGlow[scoreKey] || "none";

  return (
    <Box
      className={`card-flat press-scale p-3 mb-2 ${staggerClass}`}
      style={{ boxShadow: glowShadow }}
    >
      <div className="flex items-center">
        {showName && (
          <div
            className="avatar-circle mr-3"
            style={{ background: avatarColor.bg, color: avatarColor.text }}
          >
            {record.studentName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {showName && (
            <Text bold size="normal" style={{ color: "#1a1a1a" }} className="truncate">{record.studentName}</Text>
          )}
          <div className="flex items-center flex-wrap gap-1 mt-0.5">
            <Text size="xxSmall" style={{ color: "#9ca3af" }}>{time}</Text>
            <span style={{ color: "#e5e7eb", fontSize: 12 }} className="mx-0.5">|</span>
            <Text size="xxSmall" style={{ color: "#9ca3af" }}>{record.peerCount} peer</Text>
            <FaceStatusBadge faceVerification={record.faceVerification} size="small" />
          </div>
        </div>
        <TrustBadge score={score} size="small" />
      </div>
    </Box>
  );
}
