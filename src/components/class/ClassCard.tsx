import React from "react";
import { Box, Text } from "zmp-ui";
import type { ClassDoc } from "@/types";

interface ClassCardProps {
  classDoc: ClassDoc;
  onClick?: () => void;
  showStudentCount?: boolean;
  index?: number;
}

const colors = [
  { border: "#be1d2c", bg: "rgba(190,29,44,0.15)", text: "#ef4444" },
  { border: "#a78bfa", bg: "rgba(167,139,250,0.15)", text: "#a78bfa" },
  { border: "#22c55e", bg: "rgba(34,197,94,0.15)", text: "#22c55e" },
  { border: "#f59e0b", bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
  { border: "#ec4899", bg: "rgba(236,72,153,0.15)", text: "#ec4899" },
];

function getColor(code: string) {
  let hash = 0;
  for (const ch of code) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function ClassCard({ classDoc, onClick, showStudentCount, index }: ClassCardProps) {
  const color = getColor(classDoc.code);
  const staggerClass = index !== undefined ? `animate-stagger-${Math.min(index + 1, 10)}` : "";

  return (
    <Box className={`card hover-lift press-scale p-4 mb-3 ${staggerClass}`} onClick={onClick}>
      <div className="flex items-center">
        <div
          className="avatar-circle mr-3"
          style={{
            background: color.bg,
            color: color.text,
            border: `2px solid ${color.border}`,
          }}
        >
          {classDoc.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <Text bold className="truncate" style={{ color: "#1a1a1a" }}>{classDoc.name}</Text>
          <div className="flex items-center mt-1 space-x-3">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded font-mono font-semibold"
              style={{ background: "#f0f0f5", fontSize: 12, color: "#6b7280" }}
            >
              {classDoc.code}
            </span>
            {showStudentCount && (
              <Text size="xxSmall" style={{ color: "#9ca3af" }}>
                {classDoc.studentIds.length} sinh viên
              </Text>
            )}
          </div>
        </div>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
          <path d="M7 5l5 5-5 5" />
        </svg>
      </div>
    </Box>
  );
}
