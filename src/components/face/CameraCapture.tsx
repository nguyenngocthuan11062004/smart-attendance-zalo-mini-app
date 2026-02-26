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
  const [showFlash, setShowFlash] = useState(false);

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

    // Flash effect
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 300);

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
            Thu lai
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <div
        style={{
          position: "relative",
          width: 256,
          height: 256,
          borderRadius: "50%",
          overflow: "hidden",
          background: "#f2f2f7",
          boxShadow: cameraReady
            ? "0 0 30px rgba(34,197,94,0.25), 0 0 60px rgba(34,197,94,0.1)"
            : "0 0 20px rgba(167,139,250,0.3)",
          transition: "box-shadow 0.5s ease",
        }}
      >
        {/* Flash overlay */}
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

        {/* Oval guide overlay */}
        <div style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none" }}>
          <svg viewBox="0 0 256 256" style={{ width: "100%", height: "100%" }}>
            <defs>
              <mask id="oval-mask">
                <rect width="256" height="256" fill="white" />
                <ellipse cx="128" cy="128" rx="90" ry="115" fill="black" />
              </mask>
            </defs>
            <rect width="256" height="256" fill="rgba(242,242,247,0.6)" mask="url(#oval-mask)" />
            <ellipse
              cx="128" cy="128" rx="90" ry="115"
              fill="none"
              stroke={cameraReady ? "#22c55e" : "#6b7280"}
              strokeWidth="2"
              strokeDasharray={cameraReady ? "none" : "8 4"}
              className={!cameraReady ? "animate-rotating-dash" : ""}
              style={{ transition: "stroke 0.4s ease" }}
            />
          </svg>
        </div>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "scaleX(-1)",
          }}
        />
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {cameraReady && (
        <div className="flex items-center gap-2 animate-fade-in">
          <div className="animate-breathe" style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 8px rgba(34,197,94,0.5)",
          }} />
          <p style={{ color: "#22c55e", textAlign: "center", fontSize: 12 }}>
            Dat khuon mat trong khung tron
          </p>
        </div>
      )}

      <button
        className={`btn-primary-dark press-scale ${cameraReady && !disabled ? "glow-red animate-glow-pulse" : ""}`}
        disabled={!cameraReady || disabled}
        onClick={capture}
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 700,
          transition: "all 0.3s ease",
        }}
      >
        Chup
      </button>
    </div>
  );
}
