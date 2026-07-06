import React, { useEffect, useState, useCallback } from "react";
import { Page } from "zmp-ui";
import { useParams, useNavigate } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { activeSessionAtom } from "@/store/session";
import { globalErrorAtom } from "@/store/ui";
import { useAttendance } from "@/hooks/useAttendance";
import { useSessionSubscription } from "@/hooks/useSession";
import { useQRScanner } from "@/hooks/useQRScanner";
import { useQRGenerator } from "@/hooks/useQRGenerator";
import { useGeolocation } from "@/hooks/useGeolocation";
// Client-side QR validation removed — Cloud Functions handle HMAC verification server-side
import { addBidirectionalPeerVerification } from "@/services/attendance.service";
import { getSession, getSessionSecret } from "@/services/session.service";
import { getUserDoc } from "@/services/auth.service";
import QRDisplay from "@/components/qr/QRDisplay";
import QRScanner from "@/components/qr/QRScanner";
import InlineQRScanner from "@/components/qr/InlineQRScanner";
import FaceVerification from "@/components/face/FaceVerification";
import { parseScannedQR } from "@/services/qr.service";
import { classifyTeacherQR } from "@/utils/validation";
import { checkGeoFence } from "@/utils/geo";
import { haptic } from "@/utils/haptic";
import type { FaceVerificationResult } from "@/types";
import { REQUIRED_PEERS } from "@/types";

/* ── Step Indicator ─────────────────────────────── */
type StepKey = "idle" | "scan-teacher" | "face-verify" | "show-qr" | "scan-peers" | "done";

function getStepLabels(faceReq: boolean, peerReq: boolean): string[] {
  const labels = ["Quét QR"];
  if (faceReq) labels.push("Khuôn mặt");
  if (peerReq) labels.push("Ngang hàng");
  labels.push("Hoàn tất");
  return labels;
}

function getStepIndex(step: StepKey, faceReq: boolean, peerReq: boolean): number {
  const lastIdx = getStepLabels(faceReq, peerReq).length - 1;
  if (step === "idle" || step === "scan-teacher") return 0;
  let idx = 1;
  if (step === "face-verify") return faceReq ? idx : 0;
  if (faceReq) idx++;
  if (step === "show-qr" || step === "scan-peers") return peerReq ? idx : lastIdx;
  return lastIdx;
}

function StepIndicatorBar({ step, faceRequired, peerRequired }: { step: StepKey; faceRequired: boolean; peerRequired: boolean }) {
  const labels = getStepLabels(faceRequired, peerRequired);
  const activeIdx = getStepIndex(step, faceRequired, peerRequired);
  const count = labels.length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      {/* Circles + lines */}
      <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
        {labels.map((_, i) => {
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
              {i < count - 1 && (
                <div style={{ flex: 1, height: 2.5, borderRadius: 1, background: i < activeIdx ? "#be1d2c" : "#e5e7eb" }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {/* Labels */}
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
        {labels.map((label, i) => (
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

  const { myAttendance, step, setStep, checkIn, completeFaceVerification, loaded: attendanceLoaded } =
    useAttendance(sessionId, user?.id);

  // Lắng nghe trạng thái phiên realtime: khi GV bấm "Kết thúc phiên",
  // status → "ended" đẩy về đây ngay, SV bị đưa ra khỏi luồng điểm danh
  // lập tức (màn "Phiên đã kết thúc" bên dưới), camera/scan dừng.
  useSessionSubscription(sessionId);

  const setError = useSetAtom(globalErrorAtom);
  const { scan, scanning, error: scanError } = useQRScanner();
  const { requestLocation } = useGeolocation();
  const [peerSecret, setPeerSecret] = useState<string>("");

  // Session config for optional steps (default true)
  const faceReq = session?.faceRequired !== false;
  const peerReq = session?.peerRequired !== false;

  useEffect(() => {
    if (!sessionId || session) return;
    getSession(sessionId)
      .then((s) => { if (s) setSession(s); })
      .catch(() => setError("Không thể tải phiên điểm danh"));
  }, [sessionId, session, setSession]);

  // Pre-warm GPS: trigger permission dialog & first fix while user reads UI,
  // so handleTeacherQRDetected reads from the 60s position cache instead of
  // blocking the scan handler waiting for a fresh fix.
  useEffect(() => {
    requestLocation().catch(() => {});
  }, [requestLocation]);

  // Load peer secret for QR generation (needed after check-in)
  useEffect(() => {
    if (!sessionId || !session || peerSecret) return;
    const secret = session.hmacSecret;
    if (secret) { setPeerSecret(secret); return; }
    getSessionSecret(sessionId)
      .then((s) => { if (s) setPeerSecret(s); })
      .catch(() => {});
  }, [sessionId, session, peerSecret]);

  // Gate step transitions until first snapshot resolved — avoids flashing
  // "scan-teacher" (and mounting the camera) before discovering that the
  // student already checked in / verified face / collected peers.
  useEffect(() => {
    if (!attendanceLoaded) return;
    if (myAttendance) {
      const peerDone = !peerReq || myAttendance.peerCount >= REQUIRED_PEERS;
      const faceDone = !faceReq || !!myAttendance.faceVerification;
      if (peerDone && faceDone) setStep("done");
      else if (myAttendance.checkedInAt && faceDone && peerReq) setStep("show-qr");
      else if (myAttendance.checkedInAt && faceReq) setStep("face-verify");
      else if (myAttendance.checkedInAt && !faceReq && peerReq) setStep("show-qr");
      else if (myAttendance.checkedInAt && !faceReq && !peerReq) setStep("done");
    } else {
      setStep("scan-teacher");
    }
  }, [myAttendance, faceReq, peerReq, setStep, attendanceLoaded]);

  const qrOptions =
    (step === "show-qr" || step === "scan-peers") && session && peerSecret
      ? { type: "peer" as const, sessionId: sessionId || "", userId: user?.id || "", secret: peerSecret, refreshIntervalMs: 30000 }
      : null;
  const { qrDataURL, secondsLeft, refreshSeconds } = useQRGenerator(qrOptions);

  const [teacherScanError, setTeacherScanError] = useState<string | null>(null);
  const [optimisticScan, setOptimisticScan] = useState<"idle" | "success">("idle");
  const teacherScannedRef = React.useRef(false);

  const handleTeacherQRDetected = useCallback(async (content: string) => {
    if (!session || teacherScannedRef.current) return;
    teacherScannedRef.current = true;
    setTeacherScanError(null);
    try {
      const payload = parseScannedQR(content);
      if (!payload) {
        haptic("error");
        setTeacherScanError("QR không hợp lệ");
        teacherScannedRef.current = false;
        return;
      }

      // Xác thực QR giảng viên: chữ ký sai / sai phiên → CHẶN; QR cũ (>90s,
      // vd ảnh chụp được chia sẻ) → cho qua nhưng ĐÁNH DẤU review.
      let qrStale = false;
      if (session.hmacSecret) {
        const { authentic, stale } = classifyTeacherQR(payload, session.hmacSecret);
        if (!authentic) {
          haptic("error");
          setTeacherScanError("QR không hợp lệ hoặc không thuộc phiên này");
          teacherScannedRef.current = false;
          return;
        }
        qrStale = stale;
      }

      // GPS đã pre-warm ở mount — call này thường trả từ cache (60s maxAge)
      const location = await requestLocation() ?? undefined;

      // Geofence: CÓ GPS & ngoài vùng → chặn. Phiên bật vị trí mà THIẾU GPS
      // (tắt định vị / từ chối) → không chặn nhưng đánh dấu review.
      if (location && session.location) {
        const geoCheck = checkGeoFence(
          location,
          session.location,
          session.geoFenceRadius || 200
        );
        if (!geoCheck.inRange) {
          haptic("error");
          setTeacherScanError(
            `Bạn đang ở cách lớp học ${geoCheck.distance}m (tối đa ${session.geoFenceRadius || 200}m). Vui lòng đến gần hơn.`
          );
          teacherScannedRef.current = false;
          return;
        }
      }
      const locationMissing = !!session.location && !location;

      // Tổng hợp cờ "cần xem xét"
      const reviewReasons: string[] = [];
      if (qrStale) reviewReasons.push("QR đã cũ (>90s)");
      if (locationMissing) reviewReasons.push("Thiếu vị trí GPS");
      const review = reviewReasons.length > 0
        ? { needsReview: true, reason: reviewReasons.join(" · ") }
        : undefined;

      // Optimistic: show success feedback NGAY, không đợi checkIn resolve
      // (trên 3G chậm, checkIn có thể mất 2-5s)
      haptic("success");
      setOptimisticScan("success");

      await checkIn(session.classId, user?.name || "", user?.mssv || "", payload, { faceRequired: faceReq, peerRequired: peerReq }, location, review);
      // Load peer secret from session subcollection (open rules)
      if (!peerSecret && sessionId) {
        const secret = session.hmacSecret || await getSessionSecret(sessionId);
        if (secret) setPeerSecret(secret);
      }
    } catch (err: any) {
      // Rollback optimistic UI on failure
      setOptimisticScan("idle");
      haptic("error");
      const code = err?.code?.replace("functions/", "") || "";
      if (code === "invalid-argument") {
        setTeacherScanError("QR giảng viên không hợp lệ hoặc hết hạn");
      } else {
        setTeacherScanError("Lỗi khi quét QR giảng viên. Vui lòng thử lại.");
      }
      teacherScannedRef.current = false;
    }
  }, [session, checkIn, user, requestLocation, sessionId, peerSecret, faceReq, peerReq]);

  const handleFaceComplete = async (result: FaceVerificationResult) => {
    await completeFaceVerification(result, { peerRequired: peerReq });
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
        setPeerScanError("QR không hợp lệ");
        peerScannedRef.current = false;
        return;
      }
      // Basic client-side checks (no HMAC — server validates signature)
      if (payload.userId === user.id) {
        setPeerScanError("Không thể quét QR của chính mình");
        peerScannedRef.current = false;
        return;
      }
      if (myAttendance.peerVerifications.some(v => v.peerId === payload.userId)) {
        setPeerScanError("Đã xác minh bạn này rồi");
        peerScannedRef.current = false;
        return;
      }
      let peerName = payload.userId;
      try { const peerDoc = await getUserDoc(payload.userId); if (peerDoc) peerName = peerDoc.name; } catch {}
      // Server-side validation via scanPeer Cloud Function
      await addBidirectionalPeerVerification(sessionId, user.id, user.name, payload.userId, peerName, payload.nonce, payload, myAttendance.id);
      haptic("success");
      setPeerScanActive(false);
      peerScannedRef.current = false;
    } catch (err: any) {
      const code = err?.code?.replace("functions/", "") || "";
      if (code === "already-exists") {
        setPeerScanError("Đã xác minh bạn này rồi");
      } else if (code === "invalid-argument") {
        setPeerScanError("QR bạn bè không hợp lệ hoặc hết hạn");
      } else {
        // Dùng error inline (ngay dưới camera) thay vì toast toàn cục để SV
        // biết cần quét lại đúng chỗ.
        setPeerScanError("Lỗi khi quét QR bạn bè. Vui lòng thử lại.");
      }
      peerScannedRef.current = false;
    }
  }, [session, myAttendance, user, sessionId, setError]);

  /* Loading — show skeleton until both session config and attendance state resolved */
  if (!session || !attendanceLoaded) {
    return (
      <Page style={{ background: "#f8f9fa", minHeight: "100vh", padding: 0 }}>
        <AttendanceHeader onBack={() => navigate(-1)} />
        <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Step indicator skeleton */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {[0, 1, 2, 3].map((i) => (
              <React.Fragment key={i}>
                <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 16 }} />
                {i < 3 && <div className="skeleton" style={{ flex: 1, height: 2.5, borderRadius: 1 }} />}
              </React.Fragment>
            ))}
          </div>
          {/* Title skeleton */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="skeleton" style={{ width: "55%", height: 28, borderRadius: 8 }} />
            <div className="skeleton" style={{ width: "80%", height: 16, borderRadius: 8 }} />
          </div>
          {/* Camera area skeleton */}
          <div className="skeleton" style={{ width: "100%", height: 300, borderRadius: 24 }} />
        </div>
      </Page>
    );
  }

  /* Session ended */
  if (session.status === "ended") {
    return (
      <Page style={{ background: "#f8f9fa", minHeight: "100vh", padding: 0 }}>
        <AttendanceHeader onBack={() => navigate(-1)} />
        <div style={{ padding: "60px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(107,114,128,0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
          </div>
          <p style={{ color: "#6b7280", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Phiên đã kết thúc</p>
          <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 16 }}>
            Giảng viên đã kết thúc phiên điểm danh này.
          </p>
          <button
            onClick={() => navigate("/home", { replace: true })}
            style={{
              marginTop: 24, padding: "12px 28px", borderRadius: 12, border: "none",
              background: "#be1d2c", color: "#fff", fontSize: 15, fontWeight: 600,
            }}
          >
            Về trang chủ
          </button>
        </div>
      </Page>
    );
  }

  return (
    <Page style={{ background: "#f8f9fa", minHeight: "100vh", padding: 0 }}>
      <AttendanceHeader onBack={() => navigate(-1)} />

      <div style={{ padding: "24px 20px 20px", display: "flex", flexDirection: "column", gap: 24 }}>
        <StepIndicatorBar step={step} faceRequired={faceReq} peerRequired={peerReq} />

        {/* ── Step 1: Quét QR giảng viên ── */}
        {step === "scan-teacher" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a" }}>Quét mã QR</p>
              <p style={{ fontSize: 14, color: "#6b7280" }}>Hướng camera vào mã QR của giảng viên</p>
            </div>

            {/* Live camera QR scanner */}
            <div style={{
              background: "#ffffff", borderRadius: 24, padding: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.07)",
              position: "relative",
            }}>
              <InlineQRScanner
                onDetect={handleTeacherQRDetected}
                active={step === "scan-teacher"}
                height={300}
              />
              {optimisticScan === "success" && (
                <div style={{
                  position: "absolute", inset: 12, borderRadius: 16,
                  background: "rgba(34,197,94,0.92)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexDirection: "column", gap: 14,
                  pointerEvents: "none",
                  animation: "fadeIn 0.2s ease-out",
                }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: 40, background: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                  }}>
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <span style={{ color: "#fff", fontSize: 17, fontWeight: 700 }}>Đã quét QR</span>
                  <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>Đang xác thực...</span>
                </div>
              )}
            </div>

            <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center" }}>Tự động nhận diện khi thấy mã QR</p>

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

        {/* ── Step 2: Face verification (only when faceRequired) ── */}
        {step === "face-verify" && faceReq && myAttendance && (
          <FaceVerification
            sessionId={sessionId || ""}
            attendanceId={myAttendance.id}
            userId={user?.id || ""}
            teacherId={session.teacherId}
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
              <p style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a" }}>Xác minh ngang hàng</p>
              <p style={{ fontSize: 14, color: "#6b7280" }}>Cho bạn bè quét QR của bạn & quét QR của bạn bè</p>
            </div>

            {/* Peer progress row */}
            <div style={{
              background: "#ffffff", borderRadius: 16, padding: "14px 16px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#be1d2c" }}>{pc}/{REQUIRED_PEERS}</span>
                <span style={{ fontSize: 13, color: "#6b7280" }}>peers đã xác minh</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {Array.from({ length: REQUIRED_PEERS }, (_, i) => i).map((i) => (
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
                <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: 0.5 }}>QR CỦA BẠN</span>
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
                <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: 0.5 }}>QUÉT BẠN BÈ</span>
                {pc < REQUIRED_PEERS ? (
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
                  {pc < REQUIRED_PEERS ? "Tự động nhận diện" : "Hoàn tất!"}
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
            {pc >= REQUIRED_PEERS && (
              <button
                onClick={() => { haptic("success"); setStep("done"); }}
                style={{
                  width: "100%", height: 56, borderRadius: 16,
                  background: "#22c55e", border: "none",
                  boxShadow: "0 4px 16px rgba(34,197,94,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                <span style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>Hoàn tất</span>
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

              {/* Verification rows — only show enabled steps */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  {
                    icon: <><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" /><line x1="12" y1="3" x2="12" y2="21" /></>,
                    label: "QR Code", value: "Verified", ok: true,
                    show: true,
                  },
                  {
                    icon: <><circle cx="12" cy="8" r="4" /><path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" /></>,
                    label: "Khuôn mặt",
                    value: myAttendance.faceVerification?.matched ? `${Math.round((myAttendance.faceVerification.confidence ?? 0) * 100)}% match` : (myAttendance.faceVerification?.skipped ? "Bỏ qua" : "N/A"),
                    ok: !!myAttendance.faceVerification?.matched,
                    show: faceReq,
                  },
                  {
                    icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></>,
                    label: "Ngang hàng", value: `${myAttendance.peerCount}/${REQUIRED_PEERS} peers`, ok: myAttendance.peerCount >= REQUIRED_PEERS,
                    show: peerReq,
                  },
                ].filter(row => row.show).map((row, i) => (
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
