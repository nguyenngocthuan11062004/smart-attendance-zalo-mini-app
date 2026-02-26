import React from "react";
import type { FaceVerificationResult } from "@/types";

interface FaceStatusBadgeProps {
  faceVerification?: FaceVerificationResult;
  size?: "small" | "normal";
}

export default function FaceStatusBadge({ faceVerification, size = "normal" }: FaceStatusBadgeProps) {
  const textSize = size === "small" ? 10 : 12;

  if (!faceVerification) {
    return (
      <span
        className="inline-flex items-center px-1.5 py-0.5 rounded"
        style={{ background: "#e5e7eb", fontSize: textSize, color: "#9ca3af" }}
      >
        Chưa xác minh
      </span>
    );
  }

  if (faceVerification.skipped) {
    return (
      <span
        className="inline-flex items-center px-1.5 py-0.5 rounded"
        style={{ background: "rgba(245,158,11,0.15)", fontSize: textSize, color: "#f59e0b" }}
      >
        Bỏ qua
      </span>
    );
  }

  if (faceVerification.matched && faceVerification.confidence >= 0.7) {
    return (
      <span
        className="inline-flex items-center px-1.5 py-0.5 rounded"
        style={{ background: "rgba(34,197,94,0.15)", fontSize: textSize, color: "#22c55e" }}
      >
        Khớp {Math.round(faceVerification.confidence * 100)}%
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded"
      style={{ background: "rgba(239,68,68,0.15)", fontSize: textSize, color: "#ef4444" }}
    >
      Không khớp {Math.round(faceVerification.confidence * 100)}%
    </span>
  );
}
