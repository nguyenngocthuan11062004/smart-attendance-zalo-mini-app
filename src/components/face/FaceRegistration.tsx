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
        setIssues(result.issues || ["Anh khong hop le"]);
        setState("error");
        return;
      }

      if (result.success) {
        setState("success");
        setTimeout(onComplete, 1500);
      } else {
        setErrorMsg("Dang ky that bai. Vui long thu lai.");
        setState("error");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Loi he thong");
      setState("error");
    }
  };

  if (state === "uploading") {
    return (
      <Box className="flex flex-col items-center space-y-4 py-8">
        <Spinner />
        <Text className="text-gray-500">Dang xu ly khuon mat...</Text>
      </Box>
    );
  }

  if (state === "success") {
    return (
      <Box className="flex flex-col items-center space-y-4 py-8">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <Text size="xLarge" className="text-green-600">&#10003;</Text>
        </div>
        <Text bold size="large">Dang ky thanh cong!</Text>
        <Text className="text-gray-500">Khuon mat da duoc luu lai</Text>
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
          Dam bao du sang, khuon mat ro rang, khong doi kinh ram
        </Text>
        <Button variant="primary" onClick={() => setState("capture")}>
          Chup lai
        </Button>
      </Box>
    );
  }

  return (
    <Box className="space-y-4">
      <Box className="text-center">
        <Text bold size="large">Dang ky khuon mat</Text>
        <Text size="small" className="text-gray-500">
          Chup mot tam anh ro mat de dang ky nhan dien
        </Text>
      </Box>

      <CameraCapture onCapture={handleCapture} />

      {onSkip && (
        <Box className="text-center">
          <Button size="small" variant="tertiary" onClick={onSkip}>
            Bo qua
          </Button>
        </Box>
      )}
    </Box>
  );
}
