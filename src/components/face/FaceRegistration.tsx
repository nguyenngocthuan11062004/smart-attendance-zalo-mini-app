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
      <Box className="flex flex-col items-center space-y-4 py-8">
        <Spinner />
        <Text className="text-gray-500">Đang xử lý khuôn mặt...</Text>
      </Box>
    );
  }

  if (state === "success") {
    return (
      <Box className="flex flex-col items-center space-y-4 py-8">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <Text size="xLarge" className="text-green-600">&#10003;</Text>
        </div>
        <Text bold size="large">Đăng ký thành công!</Text>
        <Text className="text-gray-500">Khuôn mặt đã được lưu lại</Text>
      </Box>
    );
  }

  if (state === "error") {
    return (
      <Box className="flex flex-col items-center space-y-4 py-6">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <Text size="xLarge" className="text-red-500">!</Text>
        </div>
        {errorMsg && <Text className="text-red-500 text-center">{errorMsg}</Text>}
        {issues.length > 0 && (
          <Box className="space-y-1">
            {issues.map((issue, i) => (
              <Text key={i} size="small" className="text-red-500 text-center">
                - {issue}
              </Text>
            ))}
          </Box>
        )}
        <Text size="xSmall" className="text-gray-400 text-center">
          Đảm bảo đủ sáng, khuôn mặt rõ ràng, không đội kính râm
        </Text>
        <Button variant="primary" onClick={() => setState("capture")}>
          Chụp lại
        </Button>
      </Box>
    );
  }

  return (
    <Box className="space-y-4">
      <Box className="text-center">
        <Text bold size="large">Đăng ký khuôn mặt</Text>
        <Text size="small" className="text-gray-500">
          Chụp một tấm ảnh rõ mặt để đăng ký nhận diện
        </Text>
      </Box>

      <CameraCapture onCapture={handleCapture} />

      {onSkip && (
        <Box className="text-center">
          <Button size="small" variant="tertiary" onClick={onSkip}>
            Bỏ qua
          </Button>
        </Box>
      )}
    </Box>
  );
}
