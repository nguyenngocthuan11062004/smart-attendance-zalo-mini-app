import React, { useState, useEffect, useRef, useCallback } from "react";
import { openChat } from "zmp-sdk";
import { verifyFace, buildSkippedResult, hasFaceData } from "@/services/face.service";
import { haptic } from "@/utils/haptic";
import type { FaceVerificationResult } from "@/types";

interface FaceVerificationProps {
  sessionId: string;
  attendanceId: string;
  userId: string;
  teacherId?: string;
  onComplete: (result: FaceVerificationResult) => void;
  onSkip: () => void;
  /** Dẫn người dùng sang trang đăng ký khuôn mặt khi chưa đăng ký. */
  onNeedRegister?: () => void;
}

type VerifyState = "scanning" | "verifying" | "success" | "failed" | "error";

export default function FaceVerification({
  sessionId,
  attendanceId,
  userId,
  teacherId,
  onComplete,
  onSkip,
  onNeedRegister,
}: FaceVerificationProps) {
  const [state, setState] = useState<VerifyState>("scanning");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Dang khoi dong camera...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Chưa đăng ký khuôn mặt → chặn quét, chỉ cho đi đăng ký (không "Bỏ qua").
  const [needRegister, setNeedRegister] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureTimerRef = useRef<number>();
  const isVerifyingRef = useRef(false);
  const mountedRef = useRef(true);


  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 640 } },
        audio: false,
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setStatusText("Căn khuôn mặt vào khung rồi bấm Chụp");
      setProgress(15);
    } catch {
      setStatusText("Không thể truy cập camera");
      setState("error");
      setErrorMsg("Không thể mở camera. Vui lòng cấp quyền camera.");
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (captureTimerRef.current) {
      clearTimeout(captureTimerRef.current);
      captureTimerRef.current = undefined;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Capture frame from video
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Mirror for selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    return canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
  }, []);

  // Chụp-để-xác-minh: chạy MỘT lần khi người dùng bấm nút. KHÔNG auto-loop
  // (vòng lặp cũ detectFace mỗi 2s rất nặng → giật/chậm). Không khớp thì quay
  // lại trạng thái chờ để bấm chụp lại, camera vẫn chạy.
  const runVerify = useCallback(async () => {
    if (isVerifyingRef.current || !mountedRef.current) return;

    const imageBase64 = captureFrame();
    if (!imageBase64) {
      setStatusText("Camera chưa sẵn sàng, thử lại sau giây lát");
      return;
    }

    isVerifyingRef.current = true;
    setState("verifying");
    setStatusText("Đang xác minh...");
    setProgress(50);

    try {
      const result = await verifyFace(imageBase64, sessionId, attendanceId, userId);

      if (!mountedRef.current) return;
      isVerifyingRef.current = false;

      if (result.error) {
        if (result.error === "no_registration") {
          setNeedRegister(true);
          setErrorMsg("Bạn chưa đăng ký khuôn mặt. Vui lòng đăng ký trước khi điểm danh.");
          setState("error");
          stopCamera();
          return;
        }
        // Lỗi tạm (chưa thấy mặt / lỗi nhận diện) — cho bấm chụp lại.
        setState("scanning");
        setProgress(0);
        setStatusText(
          result.error === "no_face_detected"
            ? "Không thấy khuôn mặt — căn vào khung rồi bấm Chụp"
            : "Lỗi nhận diện, hãy bấm Chụp lại"
        );
        return;
      }

      // Đậu khi khoảng cách Euclid < 0.6 (chuẩn face-api cho "cùng người").
      // KHÔNG siết thêm confidence>=0.7 (=distance<=0.3) như trước — ngưỡng đó
      // từ chối cả khuôn mặt đúng ở distance 0.3–0.6 (rất phổ biến do sáng/góc).
      if (result.matched) {
        setProgress(100);
        setStatusText("Xác minh thành công!");
        setState("success");
        haptic("success");
        stopCamera();
        setTimeout(() => {
          if (mountedRef.current) {
            onComplete({
              matched: true,
              confidence: result.confidence,
              selfieImagePath: "",
              verifiedAt: Date.now(),
              livenessChecked: false,
            });
          }
        }, 1200);
      } else {
        // Không khớp — báo rõ "sai mặt": overlay đỏ + badge + haptic.
        // Camera vẫn chạy để bấm "Chụp lại" ngay (không tự lặp).
        setProgress(0);
        setState("failed");
        setStatusText("Khuôn mặt không khớp — hãy chụp lại");
        haptic("error");
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      isVerifyingRef.current = false;
      setState("scanning");
      setProgress(0);
      setStatusText("Lỗi xác minh, hãy bấm Chụp lại");
    }
  }, [captureFrame, sessionId, attendanceId, userId, onComplete, stopCamera]);

  // Kiểm tra đăng ký khuôn mặt TRƯỚC khi mở camera. Chưa đăng ký thì KHÔNG bật
  // camera (không cho "quét" khi chưa có dữ liệu mặt để so) — dẫn đi đăng ký.
  // Nếu đã đăng ký mới mở camera, chờ người dùng bấm Chụp (không auto-verify).
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      const registered = userId ? await hasFaceData(userId) : false;
      if (!mountedRef.current) return;
      if (!registered) {
        setNeedRegister(true);
        setStatusText("Chưa đăng ký khuôn mặt");
        setErrorMsg("Bạn chưa đăng ký khuôn mặt. Vui lòng đăng ký trước khi điểm danh.");
        setState("error");
        return; // KHÔNG mở camera
      }
      startCamera();
    })();

    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCaptureNow = () => {
    runVerify();
  };

  const handleSkip = () => {
    stopCamera();
    // onComplete persists the skipped result and advances the step itself
    // (via completeFaceVerification — handles peerRequired correctly).
    // Calling onSkip() in addition would set step a second time and may
    // overwrite "done" with "show-qr" when peerRequired=false.
    onComplete(buildSkippedResult());
  };

  const handleRetry = () => {
    setProgress(0);
    setErrorMsg(null);
    isVerifyingRef.current = false;
    setState("scanning");
    setStatusText("Đang khởi động camera...");
    startCamera();
  };

  const handleContactTeacher = () => {
    if (!teacherId) return;
    openChat({ type: "user", id: teacherId }).catch(() => {});
  };

  // Status dot color
  const dotColor =
    state === "success" ? "#22c55e" :
    state === "failed" ? "#f59e0b" :
    state === "error" ? "#ef4444" :
    "#a78bfa";

  // Progress bar color
  const barColor =
    state === "success" ? "#22c55e" :
    state === "failed" ? "#f59e0b" :
    "#a78bfa";

  const barWidth = state === "success" ? 100 : state === "verifying" ? Math.max(progress, 50) : progress;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Title section */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <p style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a" }}>Xác minh khuôn mặt</p>
        <p style={{ fontSize: 14, color: "#6b7280" }}>Đặt khuôn mặt vào khung tròn</p>
      </div>

      {/* Face detection card */}
      <div style={{
        background: "#ffffff", borderRadius: 24, padding: 24,
        boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
      }}>
        {/* Face oval area with live camera */}
        <div style={{
          width: 180, height: 220, position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {/* Oval background + border */}
          <svg width="180" height="220" viewBox="0 0 180 220" fill="none" style={{ position: "absolute", inset: 0, zIndex: 0 }}>
            <ellipse cx="90" cy="110" rx="89" ry="109" fill="#ede9fe" stroke="#a78bfa" strokeWidth="2.5" />
          </svg>

          {/* Live video inside oval clip */}
          <div style={{
            width: 176, height: 216, position: "absolute",
            overflow: "hidden", borderRadius: "50%",
            clipPath: "ellipse(88px 108px at 50% 50%)",
          }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%", height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)",
              }}
            />
          </div>

          {/* Camera icon overlay (shown when no video) */}
          {state === "error" && (
            <div style={{ position: "relative", zIndex: 2 }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          )}

          {/* Success overlay */}
          {state === "success" && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 3,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(34,197,94,0.15)", borderRadius: "50%",
              clipPath: "ellipse(88px 108px at 50% 50%)",
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />
              </svg>
            </div>
          )}

          {/* Failed overlay */}
          {state === "failed" && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 3,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(245,158,11,0.15)", borderRadius: "50%",
              clipPath: "ellipse(88px 108px at 50% 50%)",
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
          )}
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Progress row */}
        <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#e5e7eb" }}>
            <div style={{
              width: `${barWidth}%`, height: 6, borderRadius: 3, background: barColor,
              transition: "width 0.5s ease, background 0.3s ease",
            }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: barColor, minWidth: 24, textAlign: "right" }}>
            {state === "success" ? "✓" : state === "verifying" ? "..." : ""}
          </span>
        </div>

        {/* Status row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: 4, background: dotColor,
            animation: (state === "scanning" || state === "verifying") ? "pulse 1.5s ease-in-out infinite" : "none",
          }} />
          <span style={{
            fontSize: 14,
            color: state === "success" ? "#22c55e" : state === "failed" ? "#f59e0b" : state === "error" ? "#ef4444" : "#6b7280",
            fontWeight: state === "success" ? 500 : 400,
          }}>
            {statusText}
          </span>
        </div>

        {/* Confidence badge */}
        {state === "success" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#dcfce7", borderRadius: 12, padding: "6px 14px",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
            </svg>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#22c55e" }}>Đã khớp</span>
          </div>
        )}

        {/* Failed confidence badge */}
        {state === "failed" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#fef3c7", borderRadius: 12, padding: "6px 14px",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#f59e0b" }}>Không khớp</span>
          </div>
        )}

        {/* Error message */}
        {state === "error" && errorMsg && (
          <p style={{ color: "#ef4444", fontSize: 13, textAlign: "center" }}>{errorMsg}</p>
        )}
      </div>

      {/* Tips card */}
      <div style={{
        background: "#ffffff", borderRadius: 20, padding: 20,
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6M10 22h4M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 01-1 1h-6a1 1 0 01-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>Hướng dẫn</span>
        </div>
        {[
          "Đảm bảo đủ ánh sáng xung quanh",
          "Giữ khuôn mặt ở chính giữa khung hình",
          "Không đeo kính râm hoặc khẩu trang",
        ].map((tip, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: "#a78bfa", flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#6b7280" }}>{tip}</span>
          </div>
        ))}
      </div>

      {/* Action buttons for failed/error states */}
      {(state === "failed" || state === "error") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {needRegister ? (
            // Chưa đăng ký khuôn mặt → KHÔNG cho quét, dẫn thẳng đi đăng ký.
            <button
              onClick={() => onNeedRegister?.()}
              style={{
                width: "100%", height: 52, borderRadius: 14,
                background: "#be1d2c", border: "none",
                boxShadow: "0 4px 16px rgba(190,29,44,0.25)",
                color: "#fff", fontSize: 15, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" />
              </svg>
              Đăng ký khuôn mặt
            </button>
          ) : (
            <button
              // Sai mặt (failed) → chụp lại ngay, camera còn chạy.
              // Lỗi camera (error) → mở lại camera.
              onClick={state === "failed" ? handleCaptureNow : handleRetry}
              style={{
                width: "100%", height: 52, borderRadius: 14,
                background: "#be1d2c", border: "none",
                boxShadow: "0 4px 16px rgba(190,29,44,0.25)",
                color: "#fff", fontSize: 15, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {state === "failed" && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              )}
              {state === "failed" ? "Chụp lại" : "Thử lại"}
            </button>
          )}
          {teacherId && (
            <button
              onClick={handleContactTeacher}
              style={{
                width: "100%", height: 48, borderRadius: 14,
                background: "#ffffff", border: "1.5px solid #be1d2c",
                fontSize: 15, fontWeight: 600, color: "#be1d2c",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Liên hệ giảng viên
            </button>
          )}
          {/* Chưa đăng ký → KHÔNG cho "Bỏ qua" (tránh lách qua bước mặt mà chưa
              hề có dữ liệu khuôn mặt). Buộc đi đăng ký trước. */}
          {!needRegister && (
            <button
              onClick={handleSkip}
              style={{
                width: "100%", height: 48, borderRadius: 14, background: "#f0f0f5",
                border: "none", fontSize: 15, fontWeight: 600, color: "#6b7280",
              }}
            >
              Bỏ qua
            </button>
          )}
        </div>
      )}

      {/* Capture + Skip buttons during scanning */}
      {(state === "scanning" || state === "verifying") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            onClick={handleCaptureNow}
            disabled={state === "verifying"}
            style={{
              width: "100%", height: 52, borderRadius: 14,
              background: state === "verifying" ? "#e5e7eb" : "#be1d2c", border: "none",
              boxShadow: state === "verifying" ? "none" : "0 4px 16px rgba(190,29,44,0.25)",
              color: state === "verifying" ? "#9ca3af" : "#fff", fontSize: 15, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            {state === "verifying" ? "Đang xác minh..." : "Chụp & xác minh ngay"}
          </button>
          <button
            onClick={handleSkip}
            style={{
              width: "100%", height: 48, borderRadius: 14, background: "#f0f0f5",
              border: "none", fontSize: 15, fontWeight: 600, color: "#6b7280",
            }}
          >
            Bỏ qua bước này
          </button>
        </div>
      )}
    </div>
  );
}
