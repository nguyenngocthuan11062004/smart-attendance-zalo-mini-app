import React, { useRef, useState, useCallback, useEffect } from "react";
import { Box, Text, Button } from "zmp-ui";

interface CameraCaptureProps {
  onCapture: (imageBase64: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export default function CameraCapture({ onCapture, onError, disabled }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch (err: any) {
      const msg = err.name === "NotAllowedError"
        ? "Vui long cho phep truy cap camera"
        : "Khong the mo camera";
      setCameraError(msg);
      onError?.(msg);
    }
  }, [onError]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, [startCamera, stopCamera]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    // Mirror horizontally for selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const base64 = dataUrl.split(",")[1];
    onCapture(base64);
  }, [onCapture]);

  if (cameraError) {
    return (
      <Box className="flex flex-col items-center space-y-3 py-6">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <Text size="xLarge" className="text-red-500">!</Text>
        </div>
        <Text className="text-red-500 text-center">{cameraError}</Text>
        <Button size="small" variant="tertiary" onClick={startCamera}>
          Thu lai
        </Button>
      </Box>
    );
  }

  return (
    <Box className="flex flex-col items-center space-y-4">
      <div className="relative w-64 h-64 rounded-full overflow-hidden bg-gray-900">
        {/* Oval guide overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <svg viewBox="0 0 256 256" className="w-full h-full">
            <defs>
              <mask id="oval-mask">
                <rect width="256" height="256" fill="white" />
                <ellipse cx="128" cy="128" rx="90" ry="115" fill="black" />
              </mask>
            </defs>
            <rect width="256" height="256" fill="rgba(0,0,0,0.5)" mask="url(#oval-mask)" />
            <ellipse cx="128" cy="128" rx="90" ry="115" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="8 4" />
          </svg>
        </div>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {cameraReady && (
        <Text size="xSmall" className="text-gray-500 text-center">
          Dat khuon mat trong khung tron
        </Text>
      )}

      <Button
        variant="primary"
        disabled={!cameraReady || disabled}
        onClick={capture}
      >
        Chup anh
      </Button>
    </Box>
  );
}
