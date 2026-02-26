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
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  background: isCompleted
                    ? "#a78bfa"
                    : isActive
                    ? "#be1d2c"
                    : "#e5e7eb",
                  color: isCompleted || isActive ? "#fff" : "#9ca3af",
                  boxShadow: isActive
                    ? "0 0 16px rgba(190,29,44,0.5)"
                    : isCompleted
                    ? "0 0 10px rgba(167,139,250,0.3)"
                    : "none",
                  transform: isActive ? "scale(1.15)" : "scale(1)",
                  animation: isActive ? "glowPulse 2s ease-in-out infinite" : "none",
                }}
              >
                {isCompleted ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="animate-success-pop"
                  >
                    <path d="M3 7l3 3 5-5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <p
                style={{
                  fontSize: 10,
                  marginTop: 4,
                  fontWeight: isActive ? 600 : 500,
                  transition: "color 0.3s",
                  color: isActive
                    ? "#be1d2c"
                    : isCompleted
                    ? "#a78bfa"
                    : "#9ca3af",
                }}
              >
                {s.label}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  marginBottom: 16,
                  borderRadius: 999,
                  background: i < effectiveIndex ? "#a78bfa" : "#e5e7eb",
                  transition: "background 0.5s ease, box-shadow 0.5s ease",
                  boxShadow: i < effectiveIndex ? "0 0 6px rgba(167,139,250,0.3)" : "none",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {i < effectiveIndex && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
                      animation: "shimmerSlide 2s ease-in-out infinite",
                    }}
                  />
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
