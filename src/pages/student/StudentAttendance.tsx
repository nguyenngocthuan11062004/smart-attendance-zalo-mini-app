import React, { useEffect, useState } from "react";
import { Page, Box, Text, Button, Header } from "zmp-ui";
import { useParams } from "react-router-dom";
import { useAtomValue, useAtom } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { activeSessionAtom } from "@/store/session";
import { attendanceStepAtom, type AttendanceStep } from "@/store/attendance";
import { useQRGenerator } from "@/hooks/useQRGenerator";
import { mockSession, mockAttendanceRecords } from "@/utils/mock-data";
import QRDisplay from "@/components/qr/QRDisplay";
import QRScanner from "@/components/qr/QRScanner";
import PeerCounter from "@/components/attendance/PeerCounter";
import TrustBadge from "@/components/attendance/TrustBadge";
import StepIndicator from "@/components/attendance/StepIndicator";
import FaceVerification from "@/components/face/FaceVerification";
import FaceStatusBadge from "@/components/face/FaceStatusBadge";
import type { AttendanceDoc, FaceVerificationResult } from "@/types";

export default function StudentAttendance() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const user = useAtomValue(currentUserAtom);
  const [session, setSession] = useAtom(activeSessionAtom);
  const [step, setStep] = useAtom(attendanceStepAtom);
  const [myAttendance, setMyAttendance] = useState<AttendanceDoc | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) setSession(mockSession);
    setStep("scan-teacher");
  }, []);

  const activeSession = session || mockSession;

  const qrOptions =
    step === "show-qr" || step === "scan-peers"
      ? {
          type: "peer" as const,
          sessionId: sessionId || "session_001",
          userId: user?.id || "student_001",
          secret: activeSession.hmacSecret,
          refreshIntervalMs: 30000,
        }
      : null;

  const { qrDataURL, secondsLeft, refreshSeconds } = useQRGenerator(qrOptions);

  const handleScanTeacher = () => {
    setScanning(true);
    setScanError(null);
    setTimeout(() => {
      setScanning(false);
      setMyAttendance({
        id: "att_mock",
        sessionId: sessionId || "session_001",
        classId: activeSession.classId,
        studentId: user?.id || "student_001",
        studentName: user?.name || "Nguyen Van A",
        checkedInAt: Date.now(),
        peerVerifications: [],
        peerCount: 0,
        trustScore: "absent",
      });
      setStep("face-verify");
    }, 1000);
  };

  const handleFaceComplete = (result: FaceVerificationResult) => {
    if (myAttendance) {
      setMyAttendance({ ...myAttendance, faceVerification: result });
    }
    setStep("show-qr");
  };

  const handleFaceSkip = () => {
    setStep("show-qr");
  };

  const handleScanPeer = () => {
    setScanning(true);
    setScanError(null);
    setTimeout(() => {
      setScanning(false);
      if (!myAttendance) return;

      const peerNames = ["Le Van C", "Pham Thi D", "Hoang Van E", "Vo Thi F"];
      const newCount = myAttendance.peerCount + 1;
      const peerName = peerNames[myAttendance.peerCount] || `Peer ${newCount}`;

      const updated: AttendanceDoc = {
        ...myAttendance,
        peerCount: newCount,
        peerVerifications: [
          ...myAttendance.peerVerifications,
          { peerId: `peer_${newCount}`, peerName, verifiedAt: Date.now(), qrNonce: `n${newCount}` },
        ],
        trustScore: newCount >= 3 ? "present" : newCount >= 1 ? "review" : "absent",
      };
      setMyAttendance(updated);

      if (newCount >= 3) {
        setStep("done");
      }
    }, 800);
  };

  if (activeSession.status === "ended") {
    return (
      <Page className="page">
        <Header title="Diem danh" />
        <div className="empty-state py-10">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          </div>
          <Text bold size="large" className="text-gray-600 mb-2">Phien da ket thuc</Text>
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
      <Header title={`Diem danh - ${activeSession.className}`} />

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
          <Text bold size="large" className="text-gray-700 mb-1">Quet QR giang vien</Text>
          <Text size="small" className="text-gray-400 mb-5">
            Quet ma QR tren man hinh cua giang vien
          </Text>
          <QRScanner
            onScan={handleScanTeacher}
            scanning={scanning}
            label="Quet QR giang vien"
            error={scanError}
          />
        </div>
      )}

      {/* Step 2: Face verification */}
      {step === "face-verify" && myAttendance && (
        <div className="py-4">
          <FaceVerification
            sessionId={sessionId || "session_001"}
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
            <Text bold size="large" className="text-gray-700">Xac minh ngang hang</Text>
            <Text size="small" className="text-gray-400 mt-0.5">
              Cho ban be quet QR cua ban va quet lai QR cua ho
            </Text>
          </div>

          {myAttendance && <PeerCounter current={myAttendance.peerCount} />}

          <QRDisplay
            qrDataURL={qrDataURL}
            secondsLeft={secondsLeft}
            totalSeconds={refreshSeconds}
            label="QR cua ban"
          />

          <QRScanner
            onScan={handleScanPeer}
            scanning={scanning}
            label="Quet QR ban be"
            error={scanError}
          />

          {myAttendance && myAttendance.peerCount >= 3 && (
            <div className="text-center py-2">
              <Button variant="primary" onClick={() => setStep("done")}>
                Hoan tat
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
          <Text bold size="xLarge" className="text-gray-700 mb-3">Hoan tat!</Text>
          <div className="space-y-2 mb-4">
            <TrustBadge score={myAttendance.trustScore} />
            <PeerCounter current={myAttendance.peerCount} />
            <FaceStatusBadge faceVerification={myAttendance.faceVerification} />
          </div>
          <Text size="small" className="text-gray-400">
            Ket qua diem danh se duoc giang vien xac nhan sau
          </Text>
        </div>
      )}
    </Page>
  );
}
