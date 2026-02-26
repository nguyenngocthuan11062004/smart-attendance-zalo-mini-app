import React, { useEffect } from "react";
import { Page, Text, Header } from "zmp-ui";
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
import ScoreRing from "@/components/ui/ScoreRing";
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
      .catch(() => setError("Khong the tai phien diem danh"));
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
      setError("Loi khi quet QR giang vien. Vui long thu lai.");
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
      setError("Loi khi quet QR ban be. Vui long thu lai.");
    }
  };

  if (!session) {
    return (
      <Page className="page">
        <Header title="Diem danh" />
        <div className="empty-state-dark" style={{ padding: "40px 0", textAlign: "center" }}>
          <Text size="small" style={{ color: "#9ca3af" }}>Dang tai phien...</Text>
        </div>
      </Page>
    );
  }

  if (session.status === "ended") {
    return (
      <Page className="page">
        <Header title="Diem danh" />
        <div className="empty-state-dark" style={{ padding: "40px 0", textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(107,114,128,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          </div>
          <Text bold size="large" style={{ color: "#6b7280", marginBottom: 8 }}>Phien da ket thuc</Text>
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
      <Header title={`Diem danh - ${session.className}`} />

      <StepIndicator currentStep={step} />

      {/* Step 1: Scan teacher QR */}
      {step === "scan-teacher" && (
        <div className="glass-card animate-fade-in" style={{ padding: 24, textAlign: "center" }}>
          <div
            className="animate-breathe"
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "rgba(190,29,44,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 0 20px rgba(190,29,44,0.3)",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
              <rect x="7" y="7" width="10" height="10" rx="1" />
            </svg>
          </div>
          <Text bold size="large" style={{ color: "#1a1a1a", marginBottom: 4 }}>Quet QR giang vien</Text>
          <Text size="small" style={{ color: "#6b7280", marginBottom: 20 }}>
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
        <div className="glass-card-purple animate-slide-up" style={{ padding: 16 }}>
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
        <div className="space-y-4 animate-fade-in">
          <div style={{ textAlign: "center" }}>
            <Text bold size="large" style={{ color: "#1a1a1a" }}>Xac minh ngang hang</Text>
            <Text size="small" style={{ color: "#6b7280", marginTop: 2 }}>
              Cho ban be quet QR cua ban va quet lai QR cua ho
            </Text>
          </div>

          {myAttendance && <PeerCounter current={myAttendance.peerCount} />}

          <div className="glass-card animate-glow-pulse" style={{ padding: 16 }}>
            <QRDisplay
              qrDataURL={qrDataURL}
              secondsLeft={secondsLeft}
              totalSeconds={refreshSeconds}
              label="QR cua ban"
            />
          </div>

          <QRScanner
            onScan={handleScanPeer}
            scanning={scanning}
            label="Quet QR ban be"
            error={scanError}
          />

          {myAttendance && myAttendance.peerCount >= 3 && (
            <div className="animate-bounce-in" style={{ textAlign: "center", padding: "8px 0" }}>
              <button
                className="btn-primary-dark glow-green press-scale"
                onClick={() => setStep("done")}
                style={{
                  padding: "12px 32px",
                  borderRadius: 14,
                  background: "#22c55e",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  border: "none",
                  boxShadow: "0 0 20px rgba(34,197,94,0.3)",
                }}
              >
                Hoan tat
              </button>
            </div>
          )}
        </div>
      )}

      {/* Done */}
      {step === "done" && myAttendance && (
        <div style={{ padding: "32px 0", textAlign: "center", position: "relative", overflow: "hidden" }}>
          {/* Confetti burst */}
          <div style={{ position: "absolute", top: "30%", left: "50%", pointerEvents: "none" }}>
            {[
              { tx: "30px", ty: "-50px", bg: "#22c55e" },
              { tx: "-35px", ty: "-45px", bg: "#f59e0b" },
              { tx: "50px", ty: "-20px", bg: "#be1d2c" },
              { tx: "-50px", ty: "-25px", bg: "#a78bfa" },
              { tx: "15px", ty: "-60px", bg: "#ec4899" },
              { tx: "-20px", ty: "-55px", bg: "#22c55e" },
              { tx: "40px", ty: "-35px", bg: "#f59e0b" },
              { tx: "-45px", ty: "-40px", bg: "#be1d2c" },
            ].map((c, i) => (
              <div
                key={i}
                className="confetti-particle"
                style={{
                  "--tx": c.tx,
                  "--ty": c.ty,
                  background: c.bg,
                  animationDelay: `${i * 0.05}s`,
                } as React.CSSProperties}
              />
            ))}
          </div>

          <div
            className="animate-bounce-in glow-green"
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              background: "rgba(34,197,94,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 0 30px rgba(34,197,94,0.3)",
            }}
          >
            <svg className="animate-success-pop" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <Text bold size="xLarge" className="animate-fade-in" style={{ color: "#1a1a1a", marginBottom: 12 }}>Hoan tat!</Text>
          <div className="space-y-2 mb-4">
            <div className="animate-stagger-1"><TrustBadge score={myAttendance.trustScore} /></div>
            <div className="animate-stagger-2"><PeerCounter current={myAttendance.peerCount} /></div>
            <div className="animate-stagger-3"><FaceStatusBadge faceVerification={myAttendance.faceVerification} /></div>
          </div>
          <Text size="small" className="animate-stagger-4" style={{ color: "#9ca3af" }}>
            Ket qua diem danh se duoc giang vien xac nhan sau
          </Text>
        </div>
      )}
    </Page>
  );
}
