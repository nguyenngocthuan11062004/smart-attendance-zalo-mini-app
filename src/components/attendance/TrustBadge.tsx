import React from "react";
import type { TrustScore } from "@/types";

interface TrustBadgeProps {
  score: TrustScore;
  size?: "small" | "medium";
}

const config: Record<TrustScore, { label: string; bg: string; text: string; dot: string }> = {
  present: { label: "Có mặt", bg: "rgba(34,197,94,0.15)", text: "#22c55e", dot: "#22c55e" },
  review: { label: "Xem xét", bg: "rgba(245,158,11,0.15)", text: "#f59e0b", dot: "#f59e0b" },
  absent: { label: "Vắng", bg: "rgba(239,68,68,0.15)", text: "#ef4444", dot: "#ef4444" },
};

export default function TrustBadge({ score, size = "medium" }: TrustBadgeProps) {
  const { label, bg, text, dot } = config[score];
  const sizeStyle = size === "small"
    ? { padding: "2px 8px", fontSize: 12 }
    : { padding: "4px 12px", fontSize: 14 };

  return (
    <span
      className="inline-flex items-center rounded-full font-semibold"
      style={{ background: bg, color: text, ...sizeStyle }}
    >
      <span
        className="badge-dot"
        style={{ background: dot }}
      />
      {label}
    </span>
  );
}
