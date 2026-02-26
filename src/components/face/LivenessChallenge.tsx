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
  const [showFlash, setShowFlash] = useState(false);

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
        // Flash effect on auto-capture
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 300);
        stopCamera();
        onComplete([neutralFrame, frame]);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [phase, captureFrame, neutralFrame, onComplete, stopCamera]);

  if (cameraError) {
    return (
      <div className="glass-card-red animate-shake" style={{ padding: 24 }}>
        <div className="flex flex-col items-center space-y-3">
          <div
            className="animate-bounce-in"
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(239,68,68,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 28, color: "#ef4444" }}>!</span>
          </div>
          <p className="animate-fade-in" style={{ color: "#ef4444", textAlign: "center", fontSize: 14 }}>{cameraError}</p>
          <button className="btn-secondary-dark press-scale" onClick={startCamera}>
            Thử lại
          </button>
          <button className="btn-secondary-dark press-scale" onClick={onSkip}>
            Bỏ qua
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Camera preview */}
      <div
        style={{
          position: "relative",
          width: 256,
          height: 256,
          borderRadius: "50%",
          overflow: "hidden",
          background: "#f2f2f7",
          border: phase === "countdown"
            ? "3px solid #be1d2c"
            : phase === "challenge"
              ? "3px solid #22c55e"
              : "2px solid #a78bfa",
          boxShadow: phase === "countdown"
            ? "0 0 30px rgba(190,29,44,0.35)"
            : phase === "challenge"
              ? "0 0 30px rgba(34,197,94,0.35)"
              : "0 0 20px rgba(167,139,250,0.3)",
          transition: "border-color 0.4s ease, box-shadow 0.4s ease",
        }}
        className={phase === "countdown" ? "animate-glow-pulse" : ""}
      >
        {/* Flash overlay on auto-capture */}
        {showFlash && (
          <div
            className="animate-flash"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 20,
              background: "white",
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          />
        )}

        <div style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none" }}>
          <svg viewBox="0 0 256 256" style={{ width: "100%", height: "100%" }}>
            <defs>
              <mask id="liveness-mask">
                <rect width="256" height="256" fill="white" />
                <ellipse cx="128" cy="128" rx="90" ry="115" fill="black" />
              </mask>
            </defs>
            <rect width="256" height="256" fill="rgba(242,242,247,0.6)" mask="url(#liveness-mask)" />
            <ellipse
              cx="128" cy="128" rx="90" ry="115" fill="none"
              stroke={phase === "challenge" ? "#22c55e" : phase === "countdown" ? "#be1d2c" : "#a78bfa"}
              strokeWidth="2"
              strokeDasharray={phase === "challenge" ? "none" : "8 4"}
              className={phase === "neutral" && !cameraReady ? "animate-rotating-dash" : ""}
              style={{ transition: "stroke 0.4s ease" }}
            />
          </svg>
        </div>
        <video
          ref={videoRef}
          autoPlay playsInline muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "scaleX(-1)",
          }}
        />
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Phase: Neutral */}
      {phase === "neutral" && cameraReady && (
        <div className="glass-card-purple animate-fade-in" style={{ padding: 16, textAlign: "center", width: "100%" }}>
          <div className="space-y-2">
            <p style={{ color: "#1a1a1a", fontSize: 17, fontWeight: 700 }}>Bước 1: Nhìn thẳng camera</p>
            <p style={{ color: "#6b7280", fontSize: 13 }}>Giữ khuôn mặt bình thường</p>
            <button className="btn-primary-dark press-scale glow-purple" onClick={handleCaptureNeutral}>
              Sẵn sàng
            </button>
          </div>
        </div>
      )}

      {/* Phase: Countdown */}
      {phase === "countdown" && (
        <div className="text-center space-y-2 animate-fade-in">
          <p style={{ color: "#1a1a1a", fontSize: 17, fontWeight: 700 }}>Bước 2: {challenge.label}</p>
          <p style={{ color: "#9ca3af", fontSize: 12 }}>
            Chuẩn bị...
          </p>
          <div
            className="glow-red animate-glow-pulse"
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "rgba(190,29,44,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto",
              border: "2px solid rgba(190,29,44,0.4)",
              transition: "transform 0.3s ease",
              transform: `scale(${1 + (COUNTDOWN_SECONDS - countdown) * 0.05})`,
            }}
          >
            <span style={{
              color: "#be1d2c",
              fontSize: 32,
              fontWeight: 700,
              transition: "transform 0.3s ease",
            }}>{countdown}</span>
          </div>
          <span className="animate-bounce-in" style={{ fontSize: 36, display: "inline-block" }}>{challenge.icon}</span>
        </div>
      )}

      {/* Phase: Challenge */}
      {phase === "challenge" && (
        <div className="text-center space-y-2 animate-fade-in">
          <p style={{ color: "#22c55e", fontSize: 17, fontWeight: 700 }}>
            {challenge.label} ngay!
          </p>
          <span className="animate-bounce-in" style={{ fontSize: 48, display: "inline-block" }}>{challenge.icon}</span>
          <div className="flex items-center justify-center gap-2">
            <div className="animate-breathe" style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 8px rgba(34,197,94,0.5)",
            }} />
            <p style={{ color: "#22c55e", fontSize: 13 }}>Đang chụp...</p>
          </div>
        </div>
      )}

      {!cameraReady && !cameraError && (
        <div className="flex items-center gap-2 animate-fade-in">
          <div className="animate-rotating-dash" style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            border: "2px solid transparent",
            borderTopColor: "#a78bfa",
          }} />
          <p style={{ color: "#9ca3af", fontSize: 13 }}>Đang khởi động camera...</p>
        </div>
      )}

      {/* Phase progress dots */}
      <div className="flex items-center gap-3" style={{ margin: "8px 0" }}>
        {(["neutral", "countdown", "challenge"] as const).map((p, i) => (
          <div key={p} style={{
            width: phase === p ? 24 : 8,
            height: 8,
            borderRadius: 4,
            background: phase === p
              ? (p === "challenge" ? "#22c55e" : p === "countdown" ? "#be1d2c" : "#a78bfa")
              : (["neutral", "countdown", "challenge"].indexOf(phase) > i ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.08)"),
            transition: "all 0.4s ease",
          }} />
        ))}
      </div>

      <button className="btn-secondary-dark press-scale" onClick={onSkip}>
        Bỏ qua kiểm tra
      </button>
    </div>
  );
}
