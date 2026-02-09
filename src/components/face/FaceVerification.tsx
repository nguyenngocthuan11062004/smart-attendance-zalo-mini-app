import React, { useState } from "react";
import { Box, Text, Button, Spinner } from "zmp-ui";
import CameraCapture from "./CameraCapture";
import { verifyFace, buildSkippedResult } from "@/services/face.service";
import type { FaceVerificationResult } from "@/types";

interface FaceVerificationProps {
  sessionId: string;
  attendanceId: string;
  onComplete: (result: FaceVerificationResult) => void;
  onSkip: () => void;
}

type VerifyState = "capture" | "verifying" | "success" | "failed" | "error";

export default function FaceVerification({
  sessionId,
  attendanceId,
  onComplete,
  onSkip,
}: FaceVerificationProps) {
  const [state, setState] = useState<VerifyState>("capture");
  const [confidence, setConfidence] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

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

  if (state === "verifying") {
    return (
      <Box className="flex flex-col items-center space-y-4 py-8">
        <Spinner />
        <Text className="text-gray-500">Dang xac minh khuon mat...</Text>
      </Box>
    );
  }

  if (state === "success") {
    return (
      <Box className="flex flex-col items-center space-y-4 py-8">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <Text size="xLarge" className="text-green-600">&#10003;</Text>
        </div>
        <Text bold size="large">Xac minh thanh cong!</Text>
        <Text className="text-gray-500">
          Do tin cay: {Math.round(confidence * 100)}%
        </Text>
      </Box>
    );
  }

  if (state === "failed") {
    return (
      <Box className="flex flex-col items-center space-y-4 py-6">
        <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
          <Text size="xLarge" className="text-yellow-600">?</Text>
        </div>
        <Text bold className="text-yellow-600">Khong khop khuon mat</Text>
        <Text size="small" className="text-gray-500 text-center">
          Do tin cay: {Math.round(confidence * 100)}% (can {"≥"} 70%)
        </Text>

        {retryCount < 2 ? (
          <Box className="space-y-2 flex flex-col items-center">
            <Text size="xSmall" className="text-gray-400">
              Dam bao du anh sang va nhin thang camera
            </Text>
            <Button variant="primary" onClick={() => setState("capture")}>
              Thu lai ({2 - retryCount} lan con lai)
            </Button>
          </Box>
        ) : (
          <Box className="space-y-2 flex flex-col items-center">
            <Text size="xSmall" className="text-gray-400 text-center">
              Da het luot thu. Ban co the bo qua va tiep tuc diem danh.
              Giang vien se xem xet ket qua.
            </Text>
          </Box>
        )}

        <Button size="small" variant="tertiary" onClick={handleSkip}>
          Bo qua
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
          Thu lai
        </Button>
        <Button size="small" variant="tertiary" onClick={handleSkip}>
          Bo qua
        </Button>
      </Box>
    );
  }

  // capture state
  return (
    <Box className="space-y-4">
      <Box className="text-center">
        <Text bold size="large">Xac minh khuon mat</Text>
        <Text size="small" className="text-gray-500">
          Chup selfie de xac minh danh tinh
        </Text>
      </Box>

      <CameraCapture onCapture={handleCapture} />

      <Box className="text-center">
        <Button size="small" variant="tertiary" onClick={handleSkip}>
          Bo qua buoc nay
        </Button>
      </Box>
    </Box>
  );
}
