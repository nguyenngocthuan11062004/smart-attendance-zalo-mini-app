import React from "react";
import { Box, Text } from "zmp-ui";

interface PeerCounterProps {
  current: number;
  target?: number;
}

export default function PeerCounter({ current, target = 3 }: PeerCounterProps) {
  const percentage = Math.min((current / target) * 100, 100);
  const color =
    current >= target ? "#22c55e" : current >= 1 ? "#f59e0b" : "#6b7280";

  return (
    <Box className="w-full">
      <div className="flex justify-between mb-1">
        <Text size="small" bold style={{ color: "#1a1a1a" }}>
          Xác minh bạn bè
        </Text>
        <Text size="small" style={{ color: "#6b7280" }}>
          {current}/{target} peers
        </Text>
      </div>
      <div style={{ width: "100%", background: "#e5e7eb", borderRadius: 999, height: 12 }}>
        <div
          style={{
            height: 12,
            borderRadius: 999,
            transition: "all 0.5s",
            background: color,
            width: `${percentage}%`,
          }}
        />
      </div>
    </Box>
  );
}
