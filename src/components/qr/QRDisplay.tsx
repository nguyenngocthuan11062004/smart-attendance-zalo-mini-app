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
    <Box className="flex flex-col items-center p-4">
      {label && (
        <Text size="large" bold className="mb-3 text-center">
          {label}
        </Text>
      )}
      <div className="bg-white rounded-2xl p-4 shadow-lg">
        {qrDataURL ? (
          <img src={qrDataURL} alt="QR Code" className="w-64 h-64" />
        ) : (
          <div className="w-64 h-64 flex items-center justify-center">
            <Spinner visible />
          </div>
        )}
      </div>
      <div className="mt-4">
        <QRCountdown secondsLeft={secondsLeft} totalSeconds={totalSeconds} />
      </div>
    </Box>
  );
}
