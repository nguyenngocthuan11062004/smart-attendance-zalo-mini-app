import React, { useEffect, useState } from "react";

interface ScoreRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
  glow?: boolean;
  animated?: boolean;
}

export default function ScoreRing({
  percentage,
  size = 56,
  strokeWidth = 5,
  color = "#a78bfa",
  trackColor = "#e5e7eb",
  children,
  glow = false,
  animated = false,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  const [offset, setOffset] = useState(animated ? circumference : targetOffset);

  useEffect(() => {
    if (animated) {
      const raf = requestAnimationFrame(() => setOffset(targetOffset));
      return () => cancelAnimationFrame(raf);
    }
    setOffset(targetOffset);
    return undefined;
  }, [animated, targetOffset]);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        filter: glow ? `drop-shadow(0 0 8px ${color}40)` : undefined,
      }}
    >
      <svg
        width={size}
        height={size}
        className="score-ring"
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      {children && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
