import React, { useEffect, useState } from "react";
import { Page, Box, Text, Button, Header } from "zmp-ui";
import { useParams, useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { useSession } from "@/hooks/useSession";
import { useQRGenerator } from "@/hooks/useQRGenerator";
import { getClassById } from "@/services/class.service";
import QRDisplay from "@/components/qr/QRDisplay";
import type { ClassDoc } from "@/types";

export default function TeacherSession() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);
  const { activeSession, createSession, endCurrentSession, loadActiveSessionForClass } = useSession();
  const [classDoc, setClassDoc] = useState<ClassDoc | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!classId) return;
    getClassById(classId).then(setClassDoc);
    loadActiveSessionForClass(classId);
  }, [classId]);

  const qrOptions = activeSession?.status === "active"
    ? {
        type: "teacher" as const,
        sessionId: activeSession.id,
        userId: user?.id || "",
        secret: activeSession.hmacSecret,
        refreshIntervalMs: activeSession.qrRefreshInterval * 1000,
      }
    : null;

  const { qrDataURL, secondsLeft, refreshSeconds } = useQRGenerator(qrOptions);

  const handleStart = async () => {
    if (!classDoc || !user) return;
    setStarting(true);
    try {
      const session = await createSession(classDoc.id, classDoc.name, user.id);
      // session is now active, QR will auto-generate
    } finally {
      setStarting(false);
    }
  };

  const handleEnd = async () => {
    await endCurrentSession();
    if (activeSession) {
      navigate(`/teacher/review/${activeSession.id}`);
    }
  };

  if (!classDoc) {
    return (
      <Page className="page">
        <Header title="Phiên điểm danh" />
        <Text className="text-center text-gray-500">Đang tải...</Text>
      </Page>
    );
  }

  return (
    <Page className="page">
      <Header title={classDoc.name} />

      <Box className="mb-4">
        <Text size="xSmall" className="text-gray-500">
          Mã lớp: {classDoc.code} | {classDoc.studentIds.length} sinh viên
        </Text>
      </Box>

      {!activeSession || activeSession.status === "ended" ? (
        <Box className="flex flex-col items-center space-y-4 py-8">
          <Text className="text-gray-500 text-center">
            Chưa có phiên điểm danh đang hoạt động
          </Text>
          <Button variant="primary" size="large" loading={starting} onClick={handleStart}>
            Bắt đầu điểm danh
          </Button>
        </Box>
      ) : (
        <Box className="space-y-4">
          <Box className="bg-green-50 rounded-xl p-3 text-center">
            <Text size="small" className="text-green-700">
              Phiên đang hoạt động
            </Text>
          </Box>

          <QRDisplay
            qrDataURL={qrDataURL}
            secondsLeft={secondsLeft}
            totalSeconds={refreshSeconds}
            label="QR Giảng viên"
          />

          <Box className="flex space-x-3">
            <Button
              className="flex-1"
              variant="secondary"
              onClick={() => navigate(`/teacher/monitor/${activeSession.id}`)}
            >
              Theo dõi
            </Button>
            <Button className="flex-1" variant="primary" type="danger" onClick={handleEnd}>
              Kết thúc
            </Button>
          </Box>
        </Box>
      )}
    </Page>
  );
}
