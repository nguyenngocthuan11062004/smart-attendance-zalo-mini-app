import React from "react";
import { Box, Text } from "zmp-ui";
import type { ClassDoc } from "@/types";

interface ClassCardProps {
  classDoc: ClassDoc;
  onClick?: () => void;
  showStudentCount?: boolean;
}

const colors = [
  { bg: "bg-red-500", light: "bg-red-50", text: "text-red-600" },
  { bg: "bg-rose-500", light: "bg-rose-50", text: "text-rose-600" },
  { bg: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-600" },
  { bg: "bg-amber-500", light: "bg-amber-50", text: "text-amber-600" },
  { bg: "bg-rose-500", light: "bg-rose-50", text: "text-rose-600" },
];

function getColor(code: string) {
  let hash = 0;
  for (const ch of code) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function ClassCard({ classDoc, onClick, showStudentCount }: ClassCardProps) {
  const color = getColor(classDoc.code);

  return (
    <Box className="card p-4 mb-3" onClick={onClick}>
      <div className="flex items-center">
        <div className={`avatar-circle ${color.light} ${color.text} mr-3`}>
          {classDoc.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <Text bold className="truncate">{classDoc.name}</Text>
          <div className="flex items-center mt-1 space-x-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-600 font-mono font-semibold">
              {classDoc.code}
            </span>
            {showStudentCount && (
              <Text size="xxSmall" className="text-gray-400">
                {classDoc.studentIds.length} sinh vien
              </Text>
            )}
          </div>
        </div>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round">
          <path d="M7 5l5 5-5 5" />
        </svg>
      </div>
    </Box>
  );
}
