import React, { useState } from "react";
import { Icon, Text } from "zmp-ui";

interface QRScannerProps {
  onScan: () => void;
  scanning: boolean;
  label?: string;
  error?: string | null;
}

export default function QRScanner({ onScan, scanning, label, error }: QRScannerProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleScan = () => {
    onScan();
  };

  return (
    <div className="flex flex-col items-center space-y-3" style={{ position: "relative" }}>
      {/* Success flash overlay */}
      {showSuccess && (
        <div
          className="animate-flash"
          style={{
            position: "absolute",
            inset: -20,
            background: "rgba(34,197,94,0.15)",
            borderRadius: 20,
            pointerEvents: "none",
          }}
        />
      )}
      <button
        className="btn-primary-dark press-scale"
        disabled={scanning}
        onClick={handleScan}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 16,
          padding: "12px 28px",
          opacity: scanning ? 0.6 : 1,
        }}
      >
        {scanning ? (
          <div className="animate-rotating-dash" style={{ width: 20, height: 20 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
              <path d="M10 2a8 8 0 0 1 8 8" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        ) : (
          <Icon icon="zi-camera" style={{ fontSize: 20 }} />
        )}
        {scanning ? "Đang quét..." : (label || "Quét QR")}
      </button>
      {error && (
        <p className="animate-shake" style={{ color: "#ef4444", textAlign: "center", fontSize: 13 }}>
          {error}
        </p>
      )}
    </div>
  );
}
