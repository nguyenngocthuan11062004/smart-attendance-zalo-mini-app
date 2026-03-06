import React, { useRef, useState, useCallback, useEffect } from "react";

interface CameraCaptureProps {
  onCapture: (imageBase64: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  facingMode?: "user" | "environment";
  frameShape?: "oval" | "rect";
}

export default function CameraCapture({
  onCapture,
  onError,
  disabled,
  facingMode = "user",
  frameShape = "oval",
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showFlash, setShowFlash] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);

      try {
        const { requestCameraPermission } = await import("zmp-sdk/apis");
        await requestCameraPermission({});
      } catch {
        // SDK not available or user denied — try getUserMedia directly
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
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
  }, [onError, facingMode]);

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

    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 300);

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const base64 = dataUrl.split(",")[1];
    onCapture(base64);
  }, [onCapture, facingMode]);

  if (cameraError) {
    return (
      <div style={{
        background: "#ffffff", borderRadius: 16, padding: 24,
        border: "1px solid rgba(239,68,68,0.2)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 28, background: "rgba(239,68,68,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <p style={{ color: "#ef4444", textAlign: "center", fontSize: 14, fontWeight: 600 }}>{cameraError}</p>
        <button
          onClick={startCamera}
          style={{
            width: "100%", height: 44, borderRadius: 12,
            background: "#f0f0f5", border: "none",
            fontSize: 14, fontWeight: 600, color: "#1a1a1a",
          }}
        >
          Thu lai
        </button>
      </div>
    );
  }

  const isRect = frameShape === "rect";
  const containerW = isRect ? 320 : 256;
  const containerH = isRect ? 210 : 256;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div
        style={{
          position: "relative",
          width: containerW, height: containerH,
          borderRadius: isRect ? 16 : "50%",
          overflow: "hidden", background: "#f2f2f7",
          boxShadow: cameraReady
            ? "0 0 30px rgba(34,197,94,0.25)"
            : "0 0 20px rgba(167,139,250,0.3)",
          transition: "box-shadow 0.5s ease",
        }}
      >
        {showFlash && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 20,
            background: "white", borderRadius: isRect ? 16 : "50%", pointerEvents: "none",
            animation: "fadeOut 0.3s ease-out",
          }} />
        )}

        {/* Frame overlay */}
        <div style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none" }}>
          {isRect ? (
            <svg viewBox={`0 0 ${containerW} ${containerH}`} style={{ width: "100%", height: "100%" }}>
              <defs>
                <mask id="rect-mask">
                  <rect width={containerW} height={containerH} fill="white" />
                  <rect x="16" y="12" width={containerW - 32} height={containerH - 24} rx="10" fill="black" />
                </mask>
              </defs>
              <rect width={containerW} height={containerH} fill="rgba(242,242,247,0.5)" mask="url(#rect-mask)" />
              <rect
                x="16" y="12" width={containerW - 32} height={containerH - 24} rx="10"
                fill="none"
                stroke={cameraReady ? "#22c55e" : "#6b7280"}
                strokeWidth="2"
                strokeDasharray={cameraReady ? "none" : "8 4"}
                style={{ transition: "stroke 0.4s ease" }}
              />
              {/* Corner markers */}
              {[[16, 12], [containerW - 16, 12], [16, containerH - 12], [containerW - 16, containerH - 12]].map(([cx, cy], i) => {
                const dx = i % 2 === 0 ? 1 : -1;
                const dy = i < 2 ? 1 : -1;
                return (
                  <g key={i}>
                    <line x1={cx} y1={cy} x2={cx + dx * 24} y2={cy} stroke={cameraReady ? "#22c55e" : "#be1d2c"} strokeWidth="3" strokeLinecap="round" />
                    <line x1={cx} y1={cy} x2={cx} y2={cy + dy * 18} stroke={cameraReady ? "#22c55e" : "#be1d2c"} strokeWidth="3" strokeLinecap="round" />
                  </g>
                );
              })}
            </svg>
          ) : (
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
                style={{ transition: "stroke 0.4s ease" }}
              />
            </svg>
          )}
        </div>

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%", height: "100%",
            objectFit: "cover",
            transform: facingMode === "user" ? "scaleX(-1)" : "none",
          }}
        />
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {cameraReady && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 8, height: 8, borderRadius: 4, background: "#22c55e",
            boxShadow: "0 0 8px rgba(34,197,94,0.5)",
          }} />
          <span style={{ color: "#22c55e", fontSize: 12 }}>
            {isRect ? "Dat CCCD vao khung" : "Dat khuon mat trong khung tron"}
          </span>
        </div>
      )}

      <button
        disabled={!cameraReady || disabled}
        onClick={capture}
        style={{
          width: 64, height: 64, borderRadius: 32,
          background: cameraReady && !disabled ? "#be1d2c" : "#d4d4d4",
          border: "none", color: "#ffffff",
          fontSize: 13, fontWeight: 700,
          boxShadow: cameraReady && !disabled ? "0 4px 16px rgba(190,29,44,0.3)" : "none",
        }}
      >
        Chup
      </button>
    </div>
  );
}
