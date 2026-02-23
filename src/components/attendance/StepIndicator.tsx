import React from "react";
import type { AttendanceStep } from "@/store/attendance";

interface StepIndicatorProps {
  currentStep: AttendanceStep;
}

const steps: { key: AttendanceStep; label: string }[] = [
  { key: "scan-teacher", label: "Quét GV" },
  { key: "face-verify", label: "Khuôn mặt" },
  { key: "show-qr", label: "Xác minh" },
  { key: "done", label: "Hoàn tất" },
];

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);
  const effectiveIndex = currentStep === "scan-peers" ? 2 : currentIndex;

  return (
    <div className="flex items-center justify-center space-x-1 mb-5 px-2">
      {steps.map((s, i) => {
        const isCompleted = i < effectiveIndex;
        const isActive = i === effectiveIndex;

        return (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center" style={{ minWidth: 52 }}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isActive
                    ? "bg-red-500 text-white shadow-md shadow-red-200 scale-110"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {isCompleted ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M3 7l3 3 5-5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <p
                className={`text-[10px] mt-1 font-medium ${
                  isActive ? "text-red-600" : isCompleted ? "text-emerald-600" : "text-gray-400"
                }`}
              >
                {s.label}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mb-4 rounded-full ${
                  i < effectiveIndex ? "bg-emerald-400" : "bg-gray-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
