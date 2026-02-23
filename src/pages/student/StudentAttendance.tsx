import React, { useEffect } from "react";
import { Page, Text, Button, Header } from "zmp-ui";
import { useParams } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { activeSessionAtom } from "@/store/session";
import { globalErrorAtom } from "@/store/ui";
import { useAttendance } from "@/hooks/useAttendance";
import { useQRScanner } from "@/hooks/useQRScanner";
import { useQRGenerator } from "@/hooks/useQRGenerator";
import { validateTeacherQR, validatePeerQR } from "@/utils/validation";
import { addBidirectionalPeerVerification } from "@/services/attendance.service";
import { getSession } from "@/services/session.service";
import { getUserDoc } from "@/services/auth.service";
import QRDisplay from "@/components/qr/QRDisplay";
import QRScanner from "@/components/qr/QRScanner";
import PeerCounter from "@/components/attendance/PeerCounter";
import TrustBadge from "@/components/attendance/TrustBadge";
import StepIndicator from "@/components/attendance/StepIndicator";
import FaceVerification from "@/components/face/FaceVerification";
import FaceStatusBadge from "@/components/face/FaceStatusBadge";
import type { FaceVerificationResult } from "@/types";

export default function StudentAttendance() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const user = useAtomValue(currentUserAtom);
  const session = useAtomValue(activeSessionAtom);
  const setSession = useSetAtom(activeSessionAtom);

  const { myAttendance, step, setStep, checkIn, completeFaceVerification } =
    useAttendance(sessionId, user?.id);

  const setError = useSetAtom(globalErrorAtom);
  const { scan, scanning, error: scanError } = useQRScanner();

  // Fetch session if not already in store
  useEffect(() => {
    if (!sessionId || session) return;
    getSession(sessionId)
      .then((s) => { if (s) setSession(s); })
      .catch(() => setError("Không thể tải phiên điểm danh"));
  }, [sessionId, session, setSession]);

  // Initialize step on mount
  useEffect(() => {
    if (myAttendance) {
      if (myAttendance.peerCount >= 3) {
        setStep("done");
      } else if (myAttendance.checkedInAt && myAttendance.faceVerification) {
        setStep("show-qr");
      } else if (myAttendance.checkedInAt) {
        setStep("face-verify");
      }
    } else {
      setStep("scan-teacher");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-transition to "done" when peerCount >= 3
  useEffect(() => {
    if (myAttendance && myAttendance.peerCount >= 3 && step !== "done") {
      setStep("done");
    }
  }, [myAttendance?.peerCount, step, setStep]);

  const qrOptions =
    (step === "show-qr" || step === "scan-peers") && session
      ? {
          type: "peer" as const,
          sessionId: sessionId || "",
          userId: user?.id || "",
          secret: session.hmacSecret,
          refreshIntervalMs: 30000,
        }
      : null;

  const { qrDataURL, secondsLeft, refreshSeconds } = useQRGenerator(qrOptions);

  const handleScanTeacher = async () => {
    if (!session) return;
    try {
      const payload = await scan();
      if (!payload) return;

      // Client-side validation as quick pre-check (server re-validates)
      const result = validateTeacherQR(payload, session.hmacSecret);
      if (!result.valid) return;

      // Forward raw QR payload to server for authoritative validation
      await checkIn(session.classId, user?.name || "", payload);
    } catch {
      setError("Lỗi khi quét QR giảng viên. Vui lòng thử lại.");
    }
  };

  const handleFaceComplete = async (result: FaceVerificationResult) => {
    await completeFaceVerification(result);
  };

  const handleFaceSkip = () => {
    setStep("show-qr");
  };

  const handleScanPeer = async () => {
    if (!session || !myAttendance || !user || !sessionId) return;
    try {
      const payload = await scan();
      if (!payload) return;

      // Client-side validation as quick pre-check (server re-validates)
      const result = validatePeerQR(
        payload,
        user.id,
        myAttendance.peerVerifications,
        session.hmacSecret
      );
      if (!result.valid) return;

      // Resolve peer name from user doc
      let peerName = payload.userId;
      try {
        const peerDoc = await getUserDoc(payload.userId);
        if (peerDoc) peerName = peerDoc.name;
      } catch {
        // Fall back to userId as name
      }

      // Forward raw QR payload + attendanceId to server
      await addBidirectionalPeerVerification(
        sessionId,
        user.id,
        user.name,
        payload.userId,
        peerName,
        payload.nonce,
        payload,
        myAttendance.id
      );
    } catch {
      setError("Lỗi khi quét QR bạn bè. Vui lòng thử lại.");
    }
  };

  if (!session) {
    return (
      <Page className="page">
        <Header title="Điểm danh" />
        <div className="empty-state py-10">
          <Text size="small" className="text-gray-400">Đang tải phiên...</Text>
        </div>
      </Page>
    );
  }

  if (session.status === "ended") {
    return (
      <Page className="page">
        <Header title="Điểm danh" />
        <div className="empty-state py-10">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          </div>
          <Text bold size="large" className="text-gray-600 mb-2">Phiên đã kết thúc</Text>
          {myAttendance && (
            <div className="space-y-2">
              <TrustBadge score={myAttendance.trustScore} />
              <PeerCounter current={myAttendance.peerCount} />
            </div>
          )}
        </div>
      </Page>
    );
  }

  return (
    <Page className="page">
      <Header title={`Điểm danh - ${session.className}`} />

      <StepIndicator currentStep={step} />

      {/* Step 1: Scan teacher QR */}
      {step === "scan-teacher" && (
        <div className="empty-state py-8">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
              <rect x="7" y="7" width="10" height="10" rx="1" />
            </svg>
          </div>
          <Text bold size="large" className="text-gray-700 mb-1">Quét QR giảng viên</Text>
          <Text size="small" className="text-gray-400 mb-5">
            Quét mã QR trên màn hình của giảng viên
          </Text>
          <QRScanner
            onScan={handleScanTeacher}
            scanning={scanning}
            label="Quét QR giảng viên"
            error={scanError}
          />
        </div>
      )}

      {/* Step 2: Face verification */}
      {step === "face-verify" && myAttendance && (
        <div className="py-4">
          <FaceVerification
            sessionId={sessionId || ""}
            attendanceId={myAttendance.id}
            onComplete={handleFaceComplete}
            onSkip={handleFaceSkip}
          />
        </div>
      )}

      {/* Step 3: Show QR + Scan peers */}
      {(step === "show-qr" || step === "scan-peers") && (
        <div className="space-y-4">
          <div className="text-center">
            <Text bold size="large" className="text-gray-700">Xác minh ngang hàng</Text>
            <Text size="small" className="text-gray-400 mt-0.5">
              Cho bạn bè quét QR của bạn và quét lại QR của họ
            </Text>
          </div>

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
            error={scanError}
          />

          {myAttendance && myAttendance.peerCount >= 3 && (
            <div className="text-center py-2">
              <Button variant="primary" onClick={() => setStep("done")}>
                Hoàn tất
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Done */}
      {step === "done" && myAttendance && (
        <div className="empty-state py-8">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <Text bold size="xLarge" className="text-gray-700 mb-3">Hoàn tất!</Text>
          <div className="space-y-2 mb-4">
            <TrustBadge score={myAttendance.trustScore} />
            <PeerCounter current={myAttendance.peerCount} />
            <FaceStatusBadge faceVerification={myAttendance.faceVerification} />
          </div>
          <Text size="small" className="text-gray-400">
            Kết quả điểm danh sẽ được giảng viên xác nhận sau
          </Text>
        </div>
      )}
    </Page>
  );
}
