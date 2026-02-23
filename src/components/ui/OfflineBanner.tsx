import React from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function OfflineBanner() {
  const online = useNetworkStatus();

  if (online) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 80,
        left: 16,
        right: 16,
        zIndex: 9999,
        background: "#1f2937",
        color: "#fff",
        borderRadius: 12,
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        animation: "slideUp 0.3s ease-out",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 10, flexShrink: 0 }}>
        <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
      </svg>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600 }}>Mất kết nối</p>
        <p style={{ fontSize: 11, color: "#9ca3af" }}>Một số tính năng có thể không hoạt động</p>
      </div>
    </div>
  );
}
