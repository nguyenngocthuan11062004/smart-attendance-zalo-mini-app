import React from "react";

interface DarkProgressBarProps {
  percentage: number;
  color?: string;
  height?: number;
  trackColor?: string;
}

export default function DarkProgressBar({
  percentage,
  color = "#be1d2c",
  height = 8,
  trackColor = "#e5e7eb",
}: DarkProgressBarProps) {
  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: 999,
        background: trackColor,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${Math.min(percentage, 100)}%`,
          background: color,
          borderRadius: 999,
          transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Shimmer shine overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
            animation: "shimmerSlide 2s ease-in-out infinite",
          }}
        />
      </div>
    </div>
  );
}
