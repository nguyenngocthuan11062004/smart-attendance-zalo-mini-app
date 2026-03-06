import React, { useRef, useState, useCallback, useEffect } from "react";
import jsQR from "jsqr";

interface InlineQRScannerProps {
  onDetect: (content: string) => void;
  active: boolean;
  height?: number;
  aspectRatio?: boolean;
}

export default function InlineQRScanner({ onDetect, active, height = 300, aspectRatio = false }: InlineQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanPaused, setScanPaused] = useState(false);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      try {
        const { requestCameraPermission } = await import("zmp-sdk/apis");
        await requestCameraPermission({});
      } catch { /* SDK not available */ }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch (err: any) {
      setError(
        err.name === "NotAllowedError"
          ? "Vui long cho phep truy cap camera"
          : "Khong the mo camera"
      );
    }
  }, []);

  // Scan loop
  useEffect(() => {
    if (!cameraReady || !active || scanPaused) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let running = true;

    const tick = () => {
      if (!running) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code && code.data) {
          setScanPaused(true);
          onDetect(code.data);
          // Re-enable scanning after 2s for multi-scan use cases (peer QR)
          setTimeout(() => setScanPaused(false), 2000);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [cameraReady, active, onDetect, scanPaused]);

  // Start/stop camera based on active prop
  useEffect(() => {
    if (active) {
      startCamera();
    } else {
      stopCamera();
    }
    return stopCamera;
  }, [active, startCamera, stopCamera]);

  if (error) {
    return (
      <div style={{
        background: "#111", borderRadius: 16,
        ...(aspectRatio ? { width: "100%", aspectRatio: "1" } : { height }),
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
        </svg>
        <p style={{ color: "#ef4444", fontSize: 13, textAlign: "center", padding: "0 20px" }}>{error}</p>
        <button
          onClick={startCamera}
          style={{
            background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8,
            padding: "8px 16px", color: "#fff", fontSize: 13, fontWeight: 600,
          }}
        >
          Thu lai
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "#111", ...(aspectRatio ? { width: "100%", aspectRatio: "1" } : { height }) }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Scan frame overlay */}
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        alignItems: "center", justifyContent: "center", pointerEvents: "none",
      }}>
        <div style={{ width: aspectRatio ? 120 : 200, height: aspectRatio ? 120 : 200, position: "relative" }}>
          {/* Corner markers */}
          {[
            { top: 0, left: 0, borderTop: "3px solid #be1d2c", borderLeft: "3px solid #be1d2c" },
            { top: 0, right: 0, borderTop: "3px solid #be1d2c", borderRight: "3px solid #be1d2c" },
            { bottom: 0, left: 0, borderBottom: "3px solid #be1d2c", borderLeft: "3px solid #be1d2c" },
            { bottom: 0, right: 0, borderBottom: "3px solid #be1d2c", borderRight: "3px solid #be1d2c" },
          ].map((style, i) => (
            <div key={i} style={{ position: "absolute", width: 28, height: 28, borderRadius: 2, ...style } as any} />
          ))}

          {/* Scan line animation */}
          {cameraReady && (
            <div style={{
              position: "absolute", left: 4, right: 4, height: 2,
              background: "linear-gradient(90deg, transparent, #be1d2c, transparent)",
              animation: "scanLine 2s ease-in-out infinite",
            }} />
          )}
        </div>
      </div>

      {/* Status pill */}
      <div style={{
        position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
        background: "rgba(0,0,0,0.6)", borderRadius: 20, padding: "6px 14px",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        {cameraReady ? (
          <>
            <div style={{
              width: 8, height: 8, borderRadius: 4, background: "#22c55e",
              boxShadow: "0 0 6px rgba(34,197,94,0.6)",
              animation: "pulse 1.5s infinite",
            }} />
            <span style={{ color: "#fff", fontSize: 12, fontWeight: 500 }}>Dang quet...</span>
          </>
        ) : (
          <>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: "#f59e0b" }} />
            <span style={{ color: "#fff", fontSize: 12, fontWeight: 500 }}>Dang mo camera...</span>
          </>
        )}
      </div>
    </div>
  );
}
