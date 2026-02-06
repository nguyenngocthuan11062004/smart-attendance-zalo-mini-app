import React from "react";
import { Button, Icon, Text } from "zmp-ui";

interface QRScannerProps {
  onScan: () => void;
  scanning: boolean;
  label?: string;
  error?: string | null;
}

export default function QRScanner({ onScan, scanning, label, error }: QRScannerProps) {
  return (
    <div className="flex flex-col items-center space-y-3">
      <Button
        variant="primary"
        size="large"
        loading={scanning}
        onClick={onScan}
        prefixIcon={<Icon icon="zi-camera" />}
      >
        {label || "Quét QR"}
      </Button>
      {error && (
        <Text size="small" className="text-red-500 text-center">
          {error}
        </Text>
      )}
    </div>
  );
}
