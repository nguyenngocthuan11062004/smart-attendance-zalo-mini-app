import React, { useState } from "react";
import { Box, Text, Button, Spinner } from "zmp-ui";
import CameraCapture from "./CameraCapture";
import LivenessChallenge from "./LivenessChallenge";
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
      <Box className="space-y-4">
        <Box className="text-center">
          <Text bold size="large">Kiểm tra liveness</Text>
          <Text size="small" className="text-gray-500">
            Xác minh bạn là người thật
          </Text>
        </Box>
        <LivenessChallenge
          onComplete={handleLivenessComplete}
          onSkip={handleLivenessSkip}
        />
      </Box>
    );
  }

  if (state === "verifying") {
    return (
      <Box className="flex flex-col items-center space-y-4 py-8">
        <Spinner />
        <Text className="text-gray-500">Đang xác minh khuôn mặt...</Text>
      </Box>
    );
  }

  if (state === "success") {
    return (
      <Box className="flex flex-col items-center space-y-4 py-8">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <Text size="xLarge" className="text-green-600">&#10003;</Text>
        </div>
        <Text bold size="large">Xác minh thành công!</Text>
        <Text className="text-gray-500">
          Độ tin cậy: {Math.round(confidence * 100)}%
        </Text>
        {livenessFrames && (
          <Text size="xSmall" className="text-emerald-500">Liveness check passed</Text>
        )}
      </Box>
    );
  }

  if (state === "failed") {
    return (
      <Box className="flex flex-col items-center space-y-4 py-6">
        <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
          <Text size="xLarge" className="text-yellow-600">?</Text>
        </div>
        <Text bold className="text-yellow-600">Không khớp khuôn mặt</Text>
        <Text size="small" className="text-gray-500 text-center">
          Độ tin cậy: {Math.round(confidence * 100)}% (cần {"≥"} 70%)
        </Text>

        {retryCount < 2 ? (
          <Box className="space-y-2 flex flex-col items-center">
            <Text size="xSmall" className="text-gray-400">
              Đảm bảo đủ ánh sáng và nhìn thẳng camera
            </Text>
            <Button variant="primary" onClick={() => setState("capture")}>
              Thử lại ({2 - retryCount} lần còn lại)
            </Button>
          </Box>
        ) : (
          <Box className="space-y-2 flex flex-col items-center">
            <Text size="xSmall" className="text-gray-400 text-center">
              Đã hết lượt thử. Bạn có thể bỏ qua và tiếp tục điểm danh.
              Giảng viên sẽ xem xét kết quả.
            </Text>
          </Box>
        )}

        <Button size="small" variant="tertiary" onClick={handleSkip}>
          Bỏ qua
        </Button>
      </Box>
    );
  }

  if (state === "error") {
    return (
      <Box className="flex flex-col items-center space-y-4 py-6">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <Text size="xLarge" className="text-red-500">!</Text>
        </div>
        <Text className="text-red-500 text-center">{errorMsg}</Text>
        <Button variant="primary" onClick={() => setState("capture")}>
          Thử lại
        </Button>
        <Button size="small" variant="tertiary" onClick={handleSkip}>
          Bỏ qua
        </Button>
      </Box>
    );
  }

  // capture state (fallback when liveness skipped)
  return (
    <Box className="space-y-4">
      <Box className="text-center">
        <Text bold size="large">Xác minh khuôn mặt</Text>
        <Text size="small" className="text-gray-500">
          Chụp selfie để xác minh danh tính
        </Text>
      </Box>

      <CameraCapture onCapture={handleCapture} />

      <Box className="text-center">
        <Button size="small" variant="tertiary" onClick={handleSkip}>
          Bỏ qua bước này
        </Button>
      </Box>
    </Box>
  );
}
