import React, { useRef, useState, useCallback, useEffect } from "react";
import { Box, Text, Button } from "zmp-ui";

const CHALLENGES = [
  { id: "smile", label: "Mỉm cười", icon: "😊" },
  { id: "turn_left", label: "Quay trái", icon: "👈" },
  { id: "turn_right", label: "Quay phải", icon: "👉" },
  { id: "look_up", label: "Nhìn lên", icon: "👆" },
  { id: "blink", label: "Nháy mắt", icon: "😉" },
] as const;

const COUNTDOWN_SECONDS = 3;

interface LivenessChallengeProps {
  /** Called with [neutralFrame, challengeFrame] base64 */
  onComplete: (frames: [string, string]) => void;
  onSkip: () => void;
  onError?: (error: string) => void;
}

export default function LivenessChallenge({ onComplete, onSkip, onError }: LivenessChallengeProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"neutral" | "countdown" | "challenge">("neutral");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [neutralFrame, setNeutralFrame] = useState<string | null>(null);

  // Pick a random challenge on mount
  const [challenge] = useState(() => CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)]);

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
        ? "Vui lòng cho phép truy cập camera"
        : "Không thể mở camera";
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

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    return dataUrl.split(",")[1];
  }, []);

  // Capture neutral frame, then start countdown
  const handleCaptureNeutral = useCallback(() => {
    const frame = captureFrame();
    if (!frame) return;
    setNeutralFrame(frame);
    setPhase("countdown");
    setCountdown(COUNTDOWN_SECONDS);
  }, [captureFrame]);

  // Countdown timer
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("challenge");
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  // Auto-capture challenge frame after brief delay
  useEffect(() => {
    if (phase !== "challenge") return;
    const timer = setTimeout(() => {
      const frame = captureFrame();
      if (frame && neutralFrame) {
        stopCamera();
        onComplete([neutralFrame, frame]);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [phase, captureFrame, neutralFrame, onComplete, stopCamera]);

  if (cameraError) {
    return (
      <Box className="flex flex-col items-center space-y-3 py-6">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <Text size="xLarge" className="text-red-500">!</Text>
        </div>
        <Text className="text-red-500 text-center">{cameraError}</Text>
        <Button size="small" variant="tertiary" onClick={startCamera}>
          Thử lại
        </Button>
        <Button size="small" variant="tertiary" onClick={onSkip}>
          Bỏ qua
        </Button>
      </Box>
    );
  }

  return (
    <Box className="flex flex-col items-center space-y-4">
      {/* Camera preview */}
      <div className="relative w-64 h-64 rounded-full overflow-hidden bg-gray-900">
        <div className="absolute inset-0 z-10 pointer-events-none">
          <svg viewBox="0 0 256 256" className="w-full h-full">
            <defs>
              <mask id="liveness-mask">
                <rect width="256" height="256" fill="white" />
                <ellipse cx="128" cy="128" rx="90" ry="115" fill="black" />
              </mask>
            </defs>
            <rect width="256" height="256" fill="rgba(0,0,0,0.5)" mask="url(#liveness-mask)" />
            <ellipse
              cx="128" cy="128" rx="90" ry="115" fill="none"
              stroke={phase === "challenge" ? "#10b981" : "#ef4444"}
              strokeWidth="2" strokeDasharray="8 4"
            />
          </svg>
        </div>
        <video
          ref={videoRef}
          autoPlay playsInline muted
          className="w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Phase instructions */}
      {phase === "neutral" && cameraReady && (
        <Box className="text-center space-y-2">
          <Text bold size="large">Bước 1: Nhìn thẳng camera</Text>
          <Text size="small" className="text-gray-500">Giữ khuôn mặt bình thường</Text>
          <Button variant="primary" onClick={handleCaptureNeutral}>
            Sẵn sàng
          </Button>
        </Box>
      )}

      {phase === "countdown" && (
        <Box className="text-center space-y-2">
          <Text bold size="large">Bước 2: {challenge.label}</Text>
          <Text size="xxSmall" className="text-gray-400">
            Chuẩn bị...
          </Text>
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <Text bold size="xLarge" className="text-red-500">{countdown}</Text>
          </div>
          <Text className="text-3xl">{challenge.icon}</Text>
        </Box>
      )}

      {phase === "challenge" && (
        <Box className="text-center space-y-2">
          <Text bold size="large" className="text-emerald-600">
            {challenge.label} ngay!
          </Text>
          <Text className="text-4xl animate-bounce">{challenge.icon}</Text>
          <Text size="small" className="text-gray-400">Đang chụp...</Text>
        </Box>
      )}

      {!cameraReady && !cameraError && (
        <Text size="small" className="text-gray-400">Đang khởi động camera...</Text>
      )}

      <Button size="small" variant="tertiary" onClick={onSkip}>
        Bỏ qua kiểm tra
      </Button>
    </Box>
  );
}
