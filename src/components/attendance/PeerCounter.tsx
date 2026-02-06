import React from "react";
import { Box, Text } from "zmp-ui";

interface PeerCounterProps {
  current: number;
  target?: number;
}

export default function PeerCounter({ current, target = 3 }: PeerCounterProps) {
  const percentage = Math.min((current / target) * 100, 100);
  const color =
    current >= target ? "bg-green-500" : current >= 1 ? "bg-yellow-500" : "bg-gray-300";

  return (
    <Box className="w-full">
      <div className="flex justify-between mb-1">
        <Text size="small" bold>
          Xác minh bạn bè
        </Text>
        <Text size="small" className="text-gray-600">
          {current}/{target} peers
        </Text>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </Box>
  );
}
