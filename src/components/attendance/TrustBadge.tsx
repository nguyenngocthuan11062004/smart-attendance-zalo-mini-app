import React from "react";
import type { TrustScore } from "@/types";

interface TrustBadgeProps {
  score: TrustScore;
  size?: "small" | "medium";
}

const config: Record<TrustScore, { label: string; bg: string; text: string; dot: string }> = {
  present: { label: "Có mặt", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  review: { label: "Xem xét", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  absent: { label: "Vắng", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

export default function TrustBadge({ score, size = "medium" }: TrustBadgeProps) {
  const { label, bg, text, dot } = config[score];
  const sizeClass = size === "small" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${bg} ${text} ${sizeClass}`}>
      <span className={`badge-dot ${dot}`} />
      {label}
    </span>
  );
}
