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
        <p className="text-sm font-semibold text-gray-500 mb-3">{label}</p>
      )}
      <div className="card-flat p-5">
        {qrDataURL ? (
          <img src={qrDataURL} alt="QR Code" className="w-56 h-56" />
        ) : (
          <div className="w-56 h-56 flex items-center justify-center">
            <Spinner visible />
          </div>
        )}
      </div>
      <div className="mt-3">
        <QRCountdown secondsLeft={secondsLeft} totalSeconds={totalSeconds} />
      </div>
    </div>
  );
}
