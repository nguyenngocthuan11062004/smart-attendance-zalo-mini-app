import React from "react";
import type { FaceVerificationResult } from "@/types";

interface FaceStatusBadgeProps {
  faceVerification?: FaceVerificationResult;
  size?: "small" | "normal";
}

export default function FaceStatusBadge({ faceVerification, size = "normal" }: FaceStatusBadgeProps) {
  const textSize = size === "small" ? "text-[10px]" : "text-xs";

  if (!faceVerification) {
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded bg-gray-50 ${textSize} text-gray-400`}>
        Chua xac minh
      </span>
    );
  }

  if (faceVerification.skipped) {
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 ${textSize} text-amber-600`}>
        Bo qua
      </span>
    );
  }

  if (faceVerification.matched && faceVerification.confidence >= 0.7) {
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 ${textSize} text-emerald-600`}>
        Khop {Math.round(faceVerification.confidence * 100)}%
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded bg-red-50 ${textSize} text-red-600`}>
      Khong khop {Math.round(faceVerification.confidence * 100)}%
    </span>
  );
}
