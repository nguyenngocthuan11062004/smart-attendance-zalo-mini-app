import React from "react";
import type { TrustScore } from "@/types";

interface TrustBadgeProps {
  score: TrustScore;
  size?: "small" | "medium";
}

const config: Record<TrustScore, { label: string; bg: string; text: string }> = {
  present: { label: "Có mặt", bg: "bg-green-100", text: "text-green-700" },
  review: { label: "Cần xem xét", bg: "bg-yellow-100", text: "text-yellow-700" },
  absent: { label: "Vắng", bg: "bg-red-100", text: "text-red-700" },
};

export default function TrustBadge({ score, size = "medium" }: TrustBadgeProps) {
  const { label, bg, text } = config[score];
  const sizeClass = size === "small" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${bg} ${text} ${sizeClass}`}>
      {label}
    </span>
  );
}
