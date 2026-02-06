import React from "react";
import { Text } from "zmp-ui";

interface QRCountdownProps {
  secondsLeft: number;
  totalSeconds: number;
}

export default function QRCountdown({ secondsLeft, totalSeconds }: QRCountdownProps) {
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const color = progress > 0.5 ? "#22c55e" : progress > 0.2 ? "#eab308" : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <svg width="76" height="76" viewBox="0 0 76 76">
        <circle
          cx="38"
          cy="38"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="4"
        />
        <circle
          cx="38"
          cy="38"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 38 38)"
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
        />
        <text
          x="38"
          y="43"
          textAnchor="middle"
          fontSize="16"
          fontWeight="bold"
          fill={color}
        >
          {secondsLeft}
        </text>
      </svg>
      <Text size="xSmall" className="text-gray-500 mt-1">
        Tự động làm mới
      </Text>
    </div>
  );
}
