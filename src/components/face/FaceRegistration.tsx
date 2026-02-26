import React, { useState } from "react";
import { Box, Text, Button, Spinner } from "zmp-ui";
import CameraCapture from "./CameraCapture";
import { registerFace } from "@/services/face.service";

interface FaceRegistrationProps {
  onComplete: () => void;
  onSkip?: () => void;
}

type RegState = "capture" | "uploading" | "success" | "error";

export default function FaceRegistration({ onComplete, onSkip }: FaceRegistrationProps) {
  const [state, setState] = useState<RegState>("capture");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);

  const handleCapture = async (imageBase64: string) => {
    setState("uploading");
    setErrorMsg(null);
    setIssues([]);

    try {
      const result = await registerFace(imageBase64);

      if (!result.sanityPassed) {
        setIssues(result.issues || ["Ảnh không hợp lệ"]);
        setState("error");
        return;
      }

      if (result.success) {
        setState("success");
        setTimeout(onComplete, 1500);
      } else {
        setErrorMsg("Đăng ký thất bại. Vui lòng thử lại.");
        setState("error");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi hệ thống");
      setState("error");
    }
  };

  if (state === "uploading") {
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
          <p className="animate-fade-in" style={{ color: "#6b7280", fontSize: 14 }}>Đang xử lý khuôn mặt...</p>
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
    return (
      <div className="page" style={{ minHeight: "auto" }}>
        <div className="flex flex-col items-center space-y-4 py-8">
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
          <p className="animate-fade-in" style={{ color: "#1a1a1a", fontSize: 18, fontWeight: 700 }}>Đăng ký thành công!</p>
          <p className="animate-fade-in animate-stagger-2" style={{ color: "#6b7280", fontSize: 14 }}>Khuôn mặt đã được lưu lại</p>
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
            {errorMsg && (
              <p className="animate-fade-in" style={{ color: "#ef4444", textAlign: "center", fontSize: 14 }}>{errorMsg}</p>
            )}
            {issues.length > 0 && (
              <div className="space-y-1">
                {issues.map((issue, i) => (
                  <p key={i} className={`animate-slide-up animate-stagger-${Math.min(i + 1, 10)}`} style={{ color: "#ef4444", textAlign: "center", fontSize: 13 }}>
                    - {issue}
                  </p>
                ))}
              </div>
            )}
            <p className="animate-fade-in" style={{ color: "#9ca3af", textAlign: "center", fontSize: 12 }}>
              Đảm bảo đủ sáng, khuôn mặt rõ ràng, không đội kính râm
            </p>
            <button className="btn-primary-dark glow-red press-scale" onClick={() => setState("capture")}>
              Chụp lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ minHeight: "auto" }}>
      <div className="space-y-4">
        <div className="text-center animate-slide-up animate-stagger-1">
          <p style={{ color: "#1a1a1a", fontSize: 18, fontWeight: 700 }}>Đăng ký khuôn mặt</p>
          <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
            Chụp một tấm ảnh rõ mặt để đăng ký nhận diện
          </p>
        </div>

        <div className="animate-slide-up animate-stagger-2 glass-card-purple" style={{ padding: 16 }}>
          <CameraCapture onCapture={handleCapture} />
        </div>

        {onSkip && (
          <div className="text-center animate-slide-up animate-stagger-3">
            <button className="btn-secondary-dark press-scale" onClick={onSkip}>
              Bỏ qua
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
