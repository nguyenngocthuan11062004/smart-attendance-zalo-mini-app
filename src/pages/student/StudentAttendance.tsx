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
import type { AttendanceDoc } from "@/types";

export default function StudentAttendance() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const user = useAtomValue(currentUserAtom);
  const [session, setSession] = useAtom(activeSessionAtom);
  const [step, setStep] = useAtom(attendanceStepAtom);
  const [myAttendance, setMyAttendance] = useState<AttendanceDoc | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Initialize mock session
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
    // Mock: simulate scanning teacher QR
    setTimeout(() => {
      setScanning(false);
      // Create attendance record
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
      setStep("show-qr");
    }, 1000);
  };

  const handleScanPeer = () => {
    setScanning(true);
    setScanError(null);
    // Mock: simulate scanning peer QR
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
        <Box className="text-center py-8 space-y-3">
          <Text bold size="large">Phien diem danh da ket thuc</Text>
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
      <Header title={`Diem danh - ${activeSession.className}`} />

      <StepIndicator currentStep={step} />

      {/* Step 1: Scan teacher QR */}
      {step === "scan-teacher" && (
        <Box className="flex flex-col items-center space-y-4 py-8">
          <Text bold size="large">Buoc 1: Quet QR giang vien</Text>
          <Text className="text-gray-500 text-center">
            Quet ma QR tren man hinh cua giang vien de bat dau diem danh
          </Text>
          <QRScanner
            onScan={handleScanTeacher}
            scanning={scanning}
            label="Quet QR giang vien"
            error={scanError}
          />
        </Box>
      )}

      {/* Step 2: Show QR + Scan peers */}
      {(step === "show-qr" || step === "scan-peers") && (
        <Box className="space-y-4">
          <Box className="text-center">
            <Text bold size="large">Buoc 2: Xac minh ngang hang</Text>
            <Text size="small" className="text-gray-500">
              Cho ban be quet QR cua ban va quet lai QR cua ho
            </Text>
          </Box>

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
            <Box className="text-center py-2">
              <Button variant="primary" onClick={() => setStep("done")}>
                Hoan tat
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Done */}
      {step === "done" && myAttendance && (
        <Box className="flex flex-col items-center space-y-4 py-8">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-2">
            <Text size="xLarge" className="text-green-600">&#10003;</Text>
          </div>
          <Text bold size="xLarge">Hoan tat!</Text>
          <TrustBadge score={myAttendance.trustScore} />
          <PeerCounter current={myAttendance.peerCount} />
          <Text className="text-gray-500 text-center">
            Ket qua diem danh se duoc giang vien xac nhan sau
          </Text>
        </Box>
      )}
    </Page>
  );
}
