import React, { useEffect, useState } from "react";
import { Page, Box, Text, Button, Header } from "zmp-ui";
import { useParams, useNavigate } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { activeSessionAtom } from "@/store/session";
import { useQRGenerator } from "@/hooks/useQRGenerator";
import { getClassById } from "@/services/class.service";
import { getActiveSessionForClass } from "@/services/session.service";
import { startSession, endSession } from "@/services/session.service";
import QRDisplay from "@/components/qr/QRDisplay";
import type { ClassDoc, SessionDoc } from "@/types";

export default function TeacherSession() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);
  const setActiveSession = useSetAtom(activeSessionAtom);
  const [classDoc, setClassDoc] = useState<ClassDoc | null>(null);
  const [session, setSession] = useState<SessionDoc | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!classId) return;
    getClassById(classId).then((cls) => {
      if (cls) setClassDoc(cls);
    });
    getActiveSessionForClass(classId).then((sess) => {
      if (sess) {
        setSession(sess);
        setActiveSession(sess);
      }
    });
  }, [classId]);

  const qrOptions = session?.status === "active"
    ? {
        type: "teacher" as const,
        sessionId: session.id,
        userId: user?.id || "",
        secret: session.hmacSecret,
        refreshIntervalMs: session.qrRefreshInterval * 1000,
      }
    : null;

  const { qrDataURL, secondsLeft, refreshSeconds } = useQRGenerator(qrOptions);

  const handleStart = async () => {
    if (!classDoc || !user) return;
    setStarting(true);
    try {
      const newSession = await startSession(classDoc.id, classDoc.name, user.id);
      setSession(newSession);
      setActiveSession(newSession);
    } finally {
      setStarting(false);
    }
  };

  const handleEnd = async () => {
    if (!session) return;
    await endSession(session.id);
    setSession({ ...session, status: "ended", endedAt: Date.now() });
    setActiveSession(null);
    navigate(`/teacher/review/${session.id}`);
  };

  if (!classDoc) {
    return (
      <Page className="page">
        <Header title="Phien diem danh" />
        <Text className="text-center text-gray-500">Dang tai...</Text>
      </Page>
    );
  }

  return (
    <Page className="page">
      <Header title={classDoc.name} />

      <Box className="mb-4">
        <Text size="xSmall" className="text-gray-500">
          Ma lop: {classDoc.code} | {classDoc.studentIds.length} sinh vien
        </Text>
      </Box>

      {!session || session.status === "ended" ? (
        <Box className="flex flex-col items-center space-y-4 py-8">
          <Text className="text-gray-500 text-center">
            Chua co phien diem danh dang hoat dong
          </Text>
          <Button variant="primary" size="large" loading={starting} onClick={handleStart}>
            Bat dau diem danh
          </Button>
        </Box>
      ) : (
        <Box className="space-y-4">
          <Box className="bg-green-50 rounded-xl p-3 text-center">
            <Text size="small" className="text-green-700">
              Phien dang hoat dong
            </Text>
          </Box>

          <QRDisplay
            qrDataURL={qrDataURL}
            secondsLeft={secondsLeft}
            totalSeconds={refreshSeconds}
            label="QR Giang vien"
          />

          <Box className="flex space-x-3">
            <Button
              className="flex-1"
              variant="secondary"
              onClick={() => navigate(`/teacher/monitor/${session.id}`)}
            >
              Theo doi
            </Button>
            <Button className="flex-1" variant="primary" type="danger" onClick={handleEnd}>
              Ket thuc
            </Button>
          </Box>
        </Box>
      )}
    </Page>
  );
}
