import React from "react";

interface DarkStatCardProps {
  value: string | number;
  label: string;
  color?: string;
  glow?: boolean;
  enhanced?: boolean;
}

export default function DarkStatCard({
  value,
  label,
  color = "#be1d2c",
  glow = false,
  enhanced = false,
}: DarkStatCardProps) {
  return (
    <div
      className={enhanced ? "hover-lift press-scale" : ""}
      style={{
        background: "#ffffff",
        borderRadius: 16,
        padding: "14px 8px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: glow ? `0 0 20px ${color}30` : "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      {/* Colored left accent bar (enhanced mode only) */}
      {enhanced && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 0,
            width: 4,
            height: "calc(100% - 16px)",
            borderRadius: "0 4px 4px 0",
            background: color,
            opacity: 0.6,
          }}
        />
      )}
      <p style={{ fontSize: 22, fontWeight: 700, color }}>{value}</p>
      <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{label}</p>
      {enhanced && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 40,
            height: 40,
            borderRadius: "0 16px 0 40px",
            opacity: 0.1,
            background: color,
          }}
        />
      )}
    </div>
  );
}
