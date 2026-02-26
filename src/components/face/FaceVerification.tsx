import React, { useState } from "react";
import { Box, Text, Button, Spinner } from "zmp-ui";
import CameraCapture from "./CameraCapture";
import LivenessChallenge from "./LivenessChallenge";
import ScoreRing from "@/components/ui/ScoreRing";
import { verifyFace, buildSkippedResult } from "@/services/face.service";
import type { FaceVerificationResult } from "@/types";

interface FaceVerificationProps {
  sessionId: string;
  attendanceId: string;
  onComplete: (result: FaceVerificationResult) => void;
  onSkip: () => void;
}

type VerifyState = "liveness" | "capture" | "verifying" | "success" | "failed" | "error";

export default function FaceVerification({
  sessionId,
  attendanceId,
  onComplete,
  onSkip,
}: FaceVerificationProps) {
  const [state, setState] = useState<VerifyState>("liveness");
  const [confidence, setConfidence] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [livenessFrames, setLivenessFrames] = useState<[string, string] | null>(null);

  const handleLivenessComplete = (frames: [string, string]) => {
    setLivenessFrames(frames);
    // Use the challenge frame (second frame) for face verification
    handleCapture(frames[1]);
  };

  const handleLivenessSkip = () => {
    // Student can skip liveness and go to normal capture
    setState("capture");
  };

  const handleCapture = async (imageBase64: string) => {
    setState("verifying");
    setErrorMsg(null);

    try {
      const result = await verifyFace(imageBase64, sessionId, attendanceId);

      if (result.error) {
        if (result.error === "no_registration") {
          setErrorMsg("Chua dang ky khuon mat. Vui long dang ky truoc.");
        } else {
          setErrorMsg(result.error);
        }
        setState("error");
        return;
      }

      setConfidence(result.confidence);

      if (result.matched && result.confidence >= 0.7) {
        setState("success");
        setTimeout(() => {
          onComplete({
            matched: true,
            confidence: result.confidence,
            selfieImagePath: "",
            verifiedAt: Date.now(),
            livenessChecked: !!livenessFrames,
          });
        }, 1500);
      } else {
        setState("failed");
        setRetryCount((c) => c + 1);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Loi xac minh khuon mat");
      setState("error");
    }
  };

  const handleSkip = () => {
    onComplete(buildSkippedResult());
    onSkip();
  };

  // Liveness check state (first step)
  if (state === "liveness") {
    return (
      <div className="page" style={{ minHeight: "auto" }}>
        <div className="space-y-4">
          <div className="text-center animate-slide-up animate-stagger-1">
            <p style={{ color: "#1a1a1a", fontSize: 18, fontWeight: 700 }}>Kiểm tra liveness</p>
            <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
              Xác minh bạn là người thật
            </p>
          </div>
          <LivenessChallenge
            onComplete={handleLivenessComplete}
            onSkip={handleLivenessSkip}
          />
        </div>
      </div>
    );
  }

  if (state === "verifying") {
    return (
      <div className="page" style={{ minHeight: "auto" }}>
        <div className="flex flex-col items-center space-y-4 py-8">
          <div
            className="animate-glow-pulse"
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(167,139,250,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(167,139,250,0.2)",
            }}
          >
            <Spinner />
          </div>
          <p className="animate-fade-in" style={{ color: "#6b7280", fontSize: 14 }}>Đang xác minh khuôn mặt...</p>
          <div className="animate-shimmer-slide" style={{
            width: 160,
            height: 4,
            borderRadius: 2,
            background: "rgba(167,139,250,0.1)",
            overflow: "hidden",
          }} />
        </div>
      </div>
    );
  }

  if (state === "success") {
    const pct = Math.round(confidence * 100);
    return (
      <div className="page" style={{ minHeight: "auto" }}>
        <div className="glass-card-green animate-fade-in" style={{ margin: "0 16px", padding: 24 }}>
          <div className="flex flex-col items-center space-y-4">
            <div
              className="animate-bounce-in"
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "rgba(34,197,94,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 32px rgba(34,197,94,0.35)",
              }}
            >
              <span className="animate-success-pop" style={{ fontSize: 36, color: "#22c55e" }}>&#10003;</span>
            </div>
            <p className="animate-fade-in" style={{ color: "#1a1a1a", fontSize: 18, fontWeight: 700 }}>Xác minh thành công!</p>
            <div className="flex flex-col items-center animate-slide-up animate-stagger-2" style={{ gap: 8 }}>
              <ScoreRing
                percentage={pct}
                size={128}
                strokeWidth={8}
                color="#22c55e"
                glow
                animated
              >
                <span style={{ color: "#22c55e", fontSize: 24, fontWeight: 700 }}>{pct}%</span>
              </ScoreRing>
              <p style={{ color: "#6b7280", fontSize: 13 }}>Độ tin cậy</p>
            </div>
            {livenessFrames && (
              <p className="animate-fade-in animate-stagger-3" style={{ color: "#22c55e", fontSize: 12 }}>Liveness check passed</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (state === "failed") {
    const pct = Math.round(confidence * 100);
    return (
      <div className="page" style={{ minHeight: "auto" }}>
        <div className="glass-card-amber animate-fade-in" style={{ margin: "0 16px", padding: 24 }}>
          <div className="flex flex-col items-center space-y-4">
            <div
              className="animate-bounce-in"
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(245,158,11,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 28, color: "#f59e0b" }}>?</span>
            </div>
            <p className="animate-fade-in" style={{ color: "#f59e0b", fontWeight: 700, fontSize: 15 }}>Không khớp khuôn mặt</p>
            <div className="flex flex-col items-center animate-slide-up animate-stagger-2" style={{ gap: 8 }}>
              <ScoreRing
                percentage={pct}
                size={80}
                strokeWidth={6}
                color="#f59e0b"
                glow
                animated
              >
                <span style={{ color: "#f59e0b", fontSize: 16, fontWeight: 700 }}>{pct}%</span>
              </ScoreRing>
              <p style={{ color: "#6b7280", fontSize: 13, textAlign: "center" }}>
                Độ tin cậy: {pct}% (cần {"≥"} 70%)
              </p>
            </div>

            {retryCount < 2 ? (
              <div className="flex flex-col items-center animate-slide-up animate-stagger-3" style={{ gap: 8 }}>
                <p style={{ color: "#9ca3af", fontSize: 12 }}>
                  Đảm bảo đủ ánh sáng và nhìn thẳng camera
                </p>
                <button
                  className="btn-primary-dark glow-amber press-scale"
                  onClick={() => setState("capture")}
                >
                  Thử lại ({2 - retryCount} lần còn lại)
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center animate-slide-up animate-stagger-3" style={{ gap: 8 }}>
                <p style={{ color: "#9ca3af", fontSize: 12, textAlign: "center" }}>
                  Đã hết lượt thử. Bạn có thể bỏ qua và tiếp tục điểm danh.
                  Giảng viên sẽ xem xét kết quả.
                </p>
              </div>
            )}

            <button className="btn-secondary-dark press-scale" onClick={handleSkip}>
              Bỏ qua
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="page" style={{ minHeight: "auto" }}>
        <div className="glass-card-red animate-shake" style={{ margin: "0 16px", padding: 24 }}>
          <div className="flex flex-col items-center space-y-4">
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
            <p className="animate-fade-in" style={{ color: "#ef4444", textAlign: "center", fontSize: 14 }}>{errorMsg}</p>
            <button
              className="btn-primary-dark glow-red press-scale"
              onClick={() => setState("capture")}
            >
              Thử lại
            </button>
            <button className="btn-secondary-dark press-scale" onClick={handleSkip}>
              Bỏ qua
            </button>
          </div>
        </div>
      </div>
    );
  }

  // capture state (fallback when liveness skipped)
  return (
    <div className="page" style={{ minHeight: "auto" }}>
      <div className="space-y-4">
        <div className="text-center animate-slide-up animate-stagger-1">
          <p style={{ color: "#1a1a1a", fontSize: 18, fontWeight: 700 }}>Xác minh khuôn mặt</p>
          <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
            Chụp selfie để xác minh danh tính
          </p>
        </div>

        <div className="animate-slide-up animate-stagger-2 glass-card-purple" style={{ padding: 16 }}>
          <CameraCapture onCapture={handleCapture} />
        </div>

        <div className="text-center animate-slide-up animate-stagger-3">
          <button className="btn-secondary-dark press-scale" onClick={handleSkip}>
            Bỏ qua bước này
          </button>
        </div>
      </div>
    </div>
  );
}
