import React from "react";
import { Text } from "zmp-ui";
import type { AttendanceStep } from "@/store/attendance";

interface StepIndicatorProps {
  currentStep: AttendanceStep;
}

const steps: { key: AttendanceStep; label: string }[] = [
  { key: "scan-teacher", label: "Quét GV" },
  { key: "show-qr", label: "Xác minh" },
  { key: "done", label: "Hoàn tất" },
];

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);
  const effectiveIndex = currentStep === "scan-peers" ? 1 : currentIndex;

  return (
    <div className="flex items-center justify-center space-x-2 mb-4">
      {steps.map((s, i) => {
        const isCompleted = i < effectiveIndex;
        const isActive = i === effectiveIndex;

        return (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isActive
                    ? "bg-blue-500 text-white scale-110"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {isCompleted ? "✓" : i + 1}
              </div>
              <Text
                size="xxSmall"
                className={`mt-1 ${isActive ? "text-blue-600 font-bold" : "text-gray-400"}`}
              >
                {s.label}
              </Text>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 mb-4 ${
                  i < effectiveIndex ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
