import React from "react";
import { Box, Text } from "zmp-ui";
import type { ClassDoc } from "@/types";

interface ClassCardProps {
  classDoc: ClassDoc;
  onClick?: () => void;
  showStudentCount?: boolean;
}

export default function ClassCard({ classDoc, onClick, showStudentCount }: ClassCardProps) {
  return (
    <Box
      className="p-4 bg-white rounded-xl shadow-sm mb-3 active:bg-gray-50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Text bold size="large">
            {classDoc.name}
          </Text>
          <Text size="xSmall" className="text-gray-500 mt-1">
            Mã lớp: {classDoc.code}
          </Text>
          {showStudentCount && (
            <Text size="xSmall" className="text-gray-500">
              {classDoc.studentIds.length} sinh viên
            </Text>
          )}
        </div>
        <div className="text-gray-400">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            />
          </svg>
        </div>
      </div>
    </Box>
  );
}
