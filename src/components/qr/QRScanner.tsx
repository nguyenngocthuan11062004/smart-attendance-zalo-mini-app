import React, { useState } from "react";
import { Icon, Text, Button } from "zmp-ui";

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
            borderRadius: 12,
            pointerEvents: "none",
          }}
        />
      )}
      <Button
        type="danger"
        disabled={scanning}
        loading={scanning}
        onClick={handleScan}
        prefixIcon={!scanning ? <Icon icon="zi-camera" /> : undefined}
      >
        {scanning ? "Đang quét..." : (label || "Quét QR")}
      </Button>
      {error && (
        <p className="animate-shake" style={{ color: "#ef4444", textAlign: "center", fontSize: 13 }}>
          {error}
        </p>
      )}
    </div>
  );
}
