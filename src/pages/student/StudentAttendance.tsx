import React, { useEffect, useState } from "react";
import { Page, Box, Text, Button, Header } from "zmp-ui";
import { useParams } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { activeSessionAtom } from "@/store/session";
import { attendanceStepAtom, type AttendanceStep } from "@/store/attendance";
import { useAttendance } from "@/hooks/useAttendance";
import { useQRGenerator } from "@/hooks/useQRGenerator";
import { useQRScanner } from "@/hooks/useQRScanner";
import { useSessionSubscription } from "@/hooks/useSession";
import { getSession } from "@/services/session.service";
import { getMyAttendance, addPeerVerification } from "@/services/attendance.service";
import { validateTeacherQR, validatePeerQR, parseQRContent } from "@/utils/validation";
import QRDisplay from "@/components/qr/QRDisplay";
import QRScanner from "@/components/qr/QRScanner";
import PeerCounter from "@/components/attendance/PeerCounter";
import TrustBadge from "@/components/attendance/TrustBadge";
import type { SessionDoc, QRPayload } from "@/types";

export default function StudentAttendance() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const user = useAtomValue(currentUserAtom);
  const session = useAtomValue(activeSessionAtom);
  const setSession = useSetAtom(activeSessionAtom);
  const { myAttendance, step, setStep, checkIn, addPeer } = useAttendance(sessionId, user?.id);
  const { scan, scanning, error: scanError } = useQRScanner();
  const [localError, setLocalError] = useState<string | null>(null);

  useSessionSubscription(sessionId);

  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId).then((s) => {
      if (s) setSession(s);
    });
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !user) return;
    getMyAttendance(sessionId, user.id).then((att) => {
      if (att) {
        if (att.peerCount >= 3) setStep("done");
        else setStep("show-qr");
      } else {
        setStep("scan-teacher");
      }
    });
  }, [sessionId, user?.id]);

  const qrOptions =
    step === "show-qr" || step === "scan-peers"
      ? {
          type: "peer" as const,
          sessionId: sessionId || "",
          userId: user?.id || "",
          secret: session?.hmacSecret || "",
          refreshIntervalMs: 30000,
        }
      : null;

  const { qrDataURL, secondsLeft, refreshSeconds } = useQRGenerator(qrOptions);

  const handleScanTeacher = async () => {
    setLocalError(null);
    const payload = await scan();
    if (!payload) return;

    if (!session) {
      setLocalError("Không tìm thấy phiên điểm danh");
      return;
    }

    const validation = validateTeacherQR(payload, session.hmacSecret);
    if (!validation.valid) {
      setLocalError(validation.error || "QR không hợp lệ");
      return;
    }

    if (payload.sessionId !== sessionId) {
      setLocalError("QR không thuộc phiên điểm danh này");
      return;
    }

    await checkIn(session.classId, user?.name || "");
  };

  const handleScanPeer = async () => {
    setLocalError(null);
    const payload = await scan();
    if (!payload) return;

    if (!session || !myAttendance || !user) return;

    const validation = validatePeerQR(
      payload,
      user.id,
      myAttendance.peerVerifications,
      session.hmacSecret
    );
    if (!validation.valid) {
      setLocalError(validation.error || "QR không hợp lệ");
      return;
    }

    await addPeer({
      peerId: payload.userId,
      peerName: "",
      verifiedAt: Date.now(),
      qrNonce: payload.nonce,
    });
  };

  if (!session) {
    return (
      <Page className="page">
        <Header title="Điểm danh" />
        <Box className="text-center py-8">
          <Text className="text-gray-500">Đang tải phiên điểm danh...</Text>
        </Box>
      </Page>
    );
  }

  if (session.status === "ended") {
    return (
      <Page className="page">
        <Header title="Điểm danh" />
        <Box className="text-center py-8 space-y-3">
          <Text bold size="large">
            Phiên điểm danh đã kết thúc
          </Text>
          {myAttendance && (
            <>
              <TrustBadge score={myAttendance.trustScore} />
              <PeerCounter current={myAttendance.peerCount} />
            </>
          )}
        </Box>
      </Page>
    );
  }

  return (
    <Page className="page">
      <Header title={`Điểm danh - ${session.className}`} />

      {/* Step 1: Scan teacher QR */}
      {step === "scan-teacher" && (
        <Box className="flex flex-col items-center space-y-4 py-8">
          <Text bold size="large">
            Bước 1: Quét QR giảng viên
          </Text>
          <Text className="text-gray-500 text-center">
            Quét mã QR trên màn hình của giảng viên để bắt đầu điểm danh
          </Text>
          <QRScanner
            onScan={handleScanTeacher}
            scanning={scanning}
            label="Quét QR giảng viên"
            error={localError || scanError}
          />
        </Box>
      )}

      {/* Step 2: Show QR + Scan peers */}
      {(step === "show-qr" || step === "scan-peers") && (
        <Box className="space-y-4">
          <Box className="text-center">
            <Text bold size="large">
              Bước 2: Xác minh ngang hàng
            </Text>
            <Text size="small" className="text-gray-500">
              Cho bạn bè quét QR của bạn và quét lại QR của họ
            </Text>
          </Box>

          {myAttendance && <PeerCounter current={myAttendance.peerCount} />}

          <QRDisplay
            qrDataURL={qrDataURL}
            secondsLeft={secondsLeft}
            totalSeconds={refreshSeconds}
            label="QR của bạn"
          />

          <QRScanner
            onScan={handleScanPeer}
            scanning={scanning}
            label="Quét QR bạn bè"
            error={localError || scanError}
          />

          {myAttendance && myAttendance.peerCount >= 3 && (
            <Box className="text-center py-2">
              <Button variant="primary" onClick={() => setStep("done")}>
                Hoàn tất
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Done */}
      {step === "done" && myAttendance && (
        <Box className="flex flex-col items-center space-y-4 py-8">
          <Text bold size="xLarge">
            Hoàn tất!
          </Text>
          <TrustBadge score={myAttendance.trustScore} />
          <PeerCounter current={myAttendance.peerCount} />
          <Text className="text-gray-500 text-center">
            Kết quả điểm danh sẽ được giảng viên xác nhận sau
          </Text>
        </Box>
      )}
    </Page>
  );
}
