import React from "react";
import { Box, Spinner, Text } from "zmp-ui";
import QRCountdown from "./QRCountdown";

interface QRDisplayProps {
  qrDataURL: string;
  secondsLeft: number;
  totalSeconds: number;
  label?: string;
}

export default function QRDisplay({ qrDataURL, secondsLeft, totalSeconds, label }: QRDisplayProps) {
  return (
    <div className="flex flex-col items-center">
      {label && (
        <p style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 12 }}>{label}</p>
      )}
      <div
        className="card animate-glow-pulse"
        style={{
          padding: 20,
          background: "#ffffff",
          borderRadius: 20,
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          position: "relative",
        }}
      >
        {/* Breathing glow behind QR */}
        <div
          className="animate-breathe"
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: 24,
            background: "radial-gradient(circle, rgba(190,29,44,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        {qrDataURL ? (
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              padding: 8,
              display: "inline-block",
              position: "relative",
            }}
          >
            <img src={qrDataURL} alt="QR Code" style={{ width: 224, height: 224, display: "block" }} />
          </div>
        ) : (
          <div
            style={{
              width: 224,
              height: 224,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Spinner visible />
          </div>
        )}
      </div>
      <div style={{ marginTop: 12 }}>
        <QRCountdown secondsLeft={secondsLeft} totalSeconds={totalSeconds} />
      </div>
    </div>
  );
}
