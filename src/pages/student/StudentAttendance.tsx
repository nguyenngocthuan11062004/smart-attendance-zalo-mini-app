import React, { useEffect, useState, useCallback } from "react";
import { Page } from "zmp-ui";
import { useParams, useNavigate } from "react-router-dom";
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
import InlineQRScanner from "@/components/qr/InlineQRScanner";
import TrustBadge from "@/components/attendance/TrustBadge";
import FaceVerification from "@/components/face/FaceVerification";
import { parseScannedQR } from "@/services/qr.service";
import type { FaceVerificationResult } from "@/types";

/* ── Step Indicator ─────────────────────────────── */
type StepKey = "idle" | "scan-teacher" | "face-verify" | "show-qr" | "scan-peers" | "done";
const STEP_LABELS = ["Quét QR", "Khuôn mặt", "Ngang hàng", "Hoàn tất"];

function getStepIndex(step: StepKey): number {
  if (step === "idle" || step === "scan-teacher") return 0;
  if (step === "face-verify") return 1;
  if (step === "show-qr" || step === "scan-peers") return 2;
  return 3; // done
}

function StepIndicatorBar({ step }: { step: StepKey }) {
  const activeIdx = getStepIndex(step);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      {/* Circles + lines */}
      <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
        {[0, 1, 2, 3].map((i) => {
          const isCompleted = i < activeIdx;
          const isActive = i === activeIdx;
          const circleBg = isCompleted || isActive ? "#be1d2c" : "#e5e7eb";
          const textColor = isCompleted || isActive ? "#ffffff" : "#6b7280";
          return (
            <React.Fragment key={i}>
              <div style={{
                width: 32, height: 32, borderRadius: 16, background: circleBg, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {isCompleted ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                ) : (
                  <span style={{ fontSize: 14, fontWeight: 700, color: textColor }}>{i + 1}</span>
                )}
              </div>
              {i < 3 && (
                <div style={{ flex: 1, height: 2.5, borderRadius: 1, background: i < activeIdx ? "#be1d2c" : "#e5e7eb" }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {/* Labels */}
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
        {STEP_LABELS.map((label, i) => (
          <span key={i} style={{
            fontSize: 10,
            fontWeight: i === activeIdx ? 600 : 500,
            color: i === activeIdx ? "#be1d2c" : i < activeIdx ? "#6b7280" : "#9ca3af",
            width: 64, textAlign: "center",
          }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Header ─────────────────────────────────────── */
function AttendanceHeader({ onBack }: { onBack: () => void }) {
  return (
    <div style={{
      background: "#be1d2c", borderRadius: "0 0 24px 24px",
      padding: "calc(var(--zaui-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 14px) 16px 14px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <button onClick={onBack} style={{
        width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.15)",
        border: "none", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
      </button>
      <span style={{ color: "#fff", fontSize: 17, fontWeight: 600 }}>Điểm danh</span>
      <button style={{
        width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.15)",
        border: "none", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
      </button>
    </div>
  );
}

/* ── Main Component ─────────────────────────────── */
export default function StudentAttendance() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);
  const session = useAtomValue(activeSessionAtom);
  const setSession = useSetAtom(activeSessionAtom);

  const { myAttendance, step, setStep, checkIn, completeFaceVerification } =
    useAttendance(sessionId, user?.id);

  const setError = useSetAtom(globalErrorAtom);
  const { scan, scanning, error: scanError } = useQRScanner();

  useEffect(() => {
    if (!sessionId || session) return;
    getSession(sessionId)
      .then((s) => { if (s) setSession(s); })
      .catch(() => setError("Không thể tải phiên điểm danh"));
  }, [sessionId, session, setSession]);

  useEffect(() => {
    if (myAttendance) {
      if (myAttendance.peerCount >= 3) setStep("done");
      else if (myAttendance.checkedInAt && myAttendance.faceVerification) setStep("show-qr");
      else if (myAttendance.checkedInAt) setStep("face-verify");
    } else {
      setStep("scan-teacher");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (myAttendance && myAttendance.peerCount >= 3 && step !== "done") setStep("done");
  }, [myAttendance?.peerCount, step, setStep]);

  const qrOptions =
    (step === "show-qr" || step === "scan-peers") && session
      ? { type: "peer" as const, sessionId: sessionId || "", userId: user?.id || "", secret: session.hmacSecret, refreshIntervalMs: 30000 }
      : null;
  const { qrDataURL, secondsLeft, refreshSeconds } = useQRGenerator(qrOptions);

  const [teacherScanError, setTeacherScanError] = useState<string | null>(null);
  const teacherScannedRef = React.useRef(false);

  const handleTeacherQRDetected = useCallback(async (content: string) => {
    if (!session || teacherScannedRef.current) return;
    teacherScannedRef.current = true;
    setTeacherScanError(null);
    try {
      const payload = parseScannedQR(content);
      if (!payload) {
        setTeacherScanError("QR khong hop le");
        teacherScannedRef.current = false;
        return;
      }
      const result = validateTeacherQR(payload, session.hmacSecret);
      if (!result.valid) {
        setTeacherScanError("QR giang vien khong hop le hoac het han");
        teacherScannedRef.current = false;
        return;
      }
      await checkIn(session.classId, user?.name || "", payload);
    } catch {
      setTeacherScanError("Loi khi quet QR giang vien. Vui long thu lai.");
      teacherScannedRef.current = false;
    }
  }, [session, checkIn, user]);

  const handleFaceComplete = async (result: FaceVerificationResult) => {
    await completeFaceVerification(result);
  };

  const [peerScanError, setPeerScanError] = useState<string | null>(null);
  const [peerScanActive, setPeerScanActive] = useState(false);
  const peerScannedRef = React.useRef(false);

  const handlePeerQRDetected = useCallback(async (content: string) => {
    if (!session || !myAttendance || !user || !sessionId || peerScannedRef.current) return;
    peerScannedRef.current = true;
    setPeerScanError(null);
    try {
      const payload = parseScannedQR(content);
      if (!payload) {
        setPeerScanError("QR khong hop le");
        peerScannedRef.current = false;
        return;
      }
      const result = validatePeerQR(payload, user.id, myAttendance.peerVerifications, session.hmacSecret);
      if (!result.valid) {
        setPeerScanError("QR ban be khong hop le hoac da quet");
        peerScannedRef.current = false;
        return;
      }
      let peerName = payload.userId;
      try { const peerDoc = await getUserDoc(payload.userId); if (peerDoc) peerName = peerDoc.name; } catch {}
      await addBidirectionalPeerVerification(sessionId, user.id, user.name, payload.userId, peerName, payload.nonce, payload, myAttendance.id);
      setPeerScanActive(false);
      peerScannedRef.current = false;
    } catch {
      setError("Loi khi quet QR ban be. Vui long thu lai.");
      peerScannedRef.current = false;
    }
  }, [session, myAttendance, user, sessionId, setError]);

  /* Loading */
  if (!session) {
    return (
      <Page style={{ background: "#f8f9fa", minHeight: "100vh", padding: 0 }}>
        <AttendanceHeader onBack={() => navigate(-1)} />
        <div style={{ padding: "60px 20px", textAlign: "center" }}>
          <p style={{ color: "#9ca3af", fontSize: 14 }}>Đang tải phiên...</p>
        </div>
      </Page>
    );
  }

  /* Session ended */
  if (session.status === "ended") {
    return (
      <Page style={{ background: "#f8f9fa", minHeight: "100vh", padding: 0 }}>
        <AttendanceHeader onBack={() => navigate(-1)} />
        <div style={{ padding: "60px 20px", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(107,114,128,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
          </div>
          <p style={{ color: "#6b7280", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Phiên đã kết thúc</p>
          {myAttendance && <TrustBadge score={myAttendance.trustScore} />}
        </div>
      </Page>
    );
  }

  return (
    <Page style={{ background: "#f8f9fa", minHeight: "100vh", padding: 0 }}>
      <AttendanceHeader onBack={() => navigate(-1)} />

      <div style={{ padding: "24px 20px 20px", display: "flex", flexDirection: "column", gap: 24 }}>
        <StepIndicatorBar step={step} />

        {/* ── Step 1: Quét QR giảng viên ── */}
        {step === "scan-teacher" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a" }}>Quét mã QR</p>
              <p style={{ fontSize: 14, color: "#6b7280" }}>Huong camera vao ma QR cua giang vien</p>
            </div>

            {/* Live camera QR scanner */}
            <div style={{
              background: "#ffffff", borderRadius: 24, padding: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.07)",
            }}>
              <InlineQRScanner
                onDetect={handleTeacherQRDetected}
                active={step === "scan-teacher"}
                height={300}
              />
            </div>

            <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center" }}>Tu dong nhan dien khi thay ma QR</p>

            {teacherScanError && (
              <div style={{
                background: "rgba(239,68,68,0.08)", borderRadius: 12, padding: "10px 16px",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                </svg>
                <p style={{ color: "#ef4444", fontSize: 13 }}>{teacherScanError}</p>
              </div>
            )}
          </>
        )}

        {/* ── Step 2: Face verification ── */}
        {step === "face-verify" && myAttendance && (
          <FaceVerification
            sessionId={sessionId || ""}
            attendanceId={myAttendance.id}
            onComplete={handleFaceComplete}
            onSkip={() => setStep("show-qr")}
          />
        )}

        {/* ── Step 3: Peer QR exchange ── */}
        {(step === "show-qr" || step === "scan-peers") && (() => {
          const pc = myAttendance?.peerCount ?? 0;

          return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a" }}>Xac minh ngang hang</p>
              <p style={{ fontSize: 14, color: "#6b7280" }}>Cho ban be quet QR cua ban & quet QR cua ban be</p>
            </div>

            {/* Peer progress row */}
            <div style={{
              background: "#ffffff", borderRadius: 16, padding: "14px 16px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#be1d2c" }}>{pc}/3</span>
                <span style={{ fontSize: 13, color: "#6b7280" }}>peers da xac minh</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 28, height: 28, borderRadius: 14,
                    background: i < pc ? "#dcfce7" : "#f0f0f5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {i < pc ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" /></svg>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Two-column: QR + Camera side by side */}
            <div style={{ display: "flex", gap: 12 }}>
              {/* QR code - left */}
              <div style={{
                flex: 1, background: "#ffffff", borderRadius: 20, padding: 14,
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: 0.5 }}>QR CUA BAN</span>
                {qrDataURL ? (
                  <img src={qrDataURL} alt="QR" style={{ width: "100%", aspectRatio: "1", borderRadius: 12, objectFit: "contain" }} />
                ) : (
                  <div style={{ width: "100%", aspectRatio: "1", borderRadius: 12, background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="1.5" strokeLinecap="round">
                      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3M17 17h3v3M14 20h3" />
                    </svg>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                  </svg>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#be1d2c", fontFamily: "Roboto Mono, monospace" }}>
                    {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
                  </span>
                </div>
              </div>

              {/* Camera scanner - right */}
              <div style={{
                flex: 1, background: "#ffffff", borderRadius: 20, padding: 14,
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: 0.5 }}>QUET BAN BE</span>
                {pc < 3 ? (
                  <InlineQRScanner
                    onDetect={handlePeerQRDetected}
                    active={step === "show-qr" || step === "scan-peers"}
                    height={0}
                    aspectRatio
                  />
                ) : (
                  <div style={{ width: "100%", aspectRatio: "1", borderRadius: 12, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  </div>
                )}
                <span style={{ fontSize: 11, color: "#6b7280", textAlign: "center" }}>
                  {pc < 3 ? "Tu dong nhan dien" : "Hoan tat!"}
                </span>
              </div>
            </div>

            {peerScanError && (
              <div style={{
                background: "rgba(239,68,68,0.08)", borderRadius: 12, padding: "10px 16px",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                </svg>
                <p style={{ color: "#ef4444", fontSize: 13 }}>{peerScanError}</p>
              </div>
            )}

            {/* Done button when all peers verified */}
            {pc >= 3 && (
              <button
                onClick={() => setStep("done")}
                style={{
                  width: "100%", height: 56, borderRadius: 16,
                  background: "#22c55e", border: "none",
                  boxShadow: "0 4px 16px rgba(34,197,94,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                <span style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>Hoan tat</span>
              </button>
            )}
          </>
          );
        })()}

        {/* ── Step 4: Done ── */}
        {step === "done" && myAttendance && (
          <div style={{ position: "relative" }}>
            {/* Confetti dots */}
            <div style={{ position: "absolute", top: -24, left: -20, right: -20, height: 340, pointerEvents: "none", overflow: "hidden" }}>
              {[
                { x: 20, y: 40, s: 8, c: "#22c55e", o: 0.5 },
                { x: 52, y: 95, s: 6, c: "#be1d2c", o: 0.45 },
                { x: 35, y: 160, s: 10, c: "#f59e0b", o: 0.5 },
                { x: 70, y: 65, s: 5, c: "#a78bfa", o: 0.55 },
                { x: 305, y: 45, s: 7, c: "#22c55e", o: 0.4 },
                { x: 345, y: 110, s: 9, c: "#be1d2c", o: 0.5 },
                { x: 295, y: 170, s: 6, c: "#f59e0b", o: 0.6 },
                { x: 360, y: 60, s: 8, c: "#a78bfa", o: 0.45 },
                { x: 165, y: 55, s: 7, c: "#22c55e", o: 0.55 },
                { x: 205, y: 130, s: 5, c: "#be1d2c", o: 0.4 },
                { x: 245, y: 75, s: 8, c: "#f59e0b", o: 0.5 },
                { x: 150, y: 145, s: 4, c: "#a78bfa", o: 0.6 },
              ].map((d, i) => (
                <div key={i} style={{
                  position: "absolute", left: d.x, top: d.y, width: d.s, height: d.s,
                  borderRadius: "50%", background: d.c, opacity: d.o,
                }} />
              ))}
            </div>

            {/* Success section */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, position: "relative", zIndex: 1 }}>
              {/* Double circle success icon */}
              <div style={{
                width: 88, height: 88, borderRadius: 44, background: "#dcfce7",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{
                  width: 68, height: 68, borderRadius: 34, background: "#22c55e",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
              </div>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a" }}>Điểm danh thành công!</p>
              <p style={{ fontSize: 14, color: "#6b7280" }}>Bạn đã hoàn tất quy trình điểm danh</p>
            </div>

            {/* Summary card */}
            <div style={{
              background: "#ffffff", borderRadius: 24, padding: 24, marginTop: 24,
              boxShadow: "0 4px 24px rgba(0,0,0,0.05)",
              display: "flex", flexDirection: "column", gap: 20,
            }}>
              {/* Card header */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>{session.className}</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#9ca3af" }}>{session.classId}</p>
              </div>

              <div style={{ height: 1, background: "#f0f0f5" }} />

              {/* Info section */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Time row */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#1a1a1a" }}>
                    {new Date(myAttendance.checkedInAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {/* Date row */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#1a1a1a" }}>
                    {new Date(myAttendance.checkedInAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              </div>

              <div style={{ height: 1, background: "#f0f0f5" }} />

              {/* Verification rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  {
                    icon: <><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" /><line x1="12" y1="3" x2="12" y2="21" /></>,
                    label: "QR Code", value: "Verified", ok: true,
                  },
                  {
                    icon: <><circle cx="12" cy="8" r="4" /><path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" /></>,
                    label: "Khuôn mặt",
                    value: myAttendance.faceVerification?.matched ? `${Math.round((myAttendance.faceVerification.confidence ?? 0) * 100)}% match` : (myAttendance.faceVerification?.skipped ? "Bỏ qua" : "N/A"),
                    ok: !!myAttendance.faceVerification?.matched,
                  },
                  {
                    icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></>,
                    label: "Ngang hàng", value: `${myAttendance.peerCount}/3 peers`, ok: myAttendance.peerCount >= 3,
                  },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">{row.icon}</svg>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#6b7280" }}>{row.label}</span>
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 6,
                      background: row.ok ? "#dcfce7" : "#fef3c7", borderRadius: 10, padding: "4px 10px",
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={row.ok ? "#22c55e" : "#f59e0b"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        {row.ok ? <path d="M20 6L9 17l-5-5" /> : <><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></>}
                      </svg>
                      <span style={{ fontSize: 12, fontWeight: 600, color: row.ok ? "#22c55e" : "#f59e0b" }}>{row.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Buttons - stacked vertical */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
              <button
                onClick={() => navigate("/student/history")}
                style={{
                  width: "100%", height: 52, borderRadius: 16, background: "transparent",
                  border: "1.5px solid #be1d2c",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l3 3" /><path d="M2.05 12A10 10 0 0112 2" />
                </svg>
                <span style={{ color: "#be1d2c", fontSize: 15, fontWeight: 600 }}>Xem lịch sử</span>
              </button>
              <button
                onClick={() => navigate("/home", { replace: true })}
                style={{
                  width: "100%", height: 52, borderRadius: 16, background: "#be1d2c",
                  border: "none", boxShadow: "0 4px 16px rgba(190,29,44,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9.5L12 3l9 6.5V20a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 20V9.5z" /><path d="M9 21.5V14h6v7.5" />
                </svg>
                <span style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>Về trang chủ</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
