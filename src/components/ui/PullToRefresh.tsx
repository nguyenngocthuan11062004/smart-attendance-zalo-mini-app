import React, { type ReactNode } from "react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const { containerRef, refreshing, pullDistance, threshold } = usePullToRefresh({ onRefresh });
  const progress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 10 || refreshing;

  return (
    <div ref={containerRef} style={{ position: "relative", overflowY: "auto", minHeight: "100%" }}>
      {showIndicator && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: refreshing ? 48 : pullDistance,
            transition: refreshing ? "height 0.2s" : "none",
            overflow: "hidden",
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{
              opacity: progress,
              transform: `rotate(${refreshing ? 0 : progress * 180}deg)`,
              animation: refreshing ? "ptr-spin 0.8s linear infinite" : "none",
            }}
          >
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
        </div>
      )}
      {children}
    </div>
  );
}
