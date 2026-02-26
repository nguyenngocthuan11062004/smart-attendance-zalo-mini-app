import React, { useEffect, useState } from "react";
import { Page, Box, Text, Button, Header } from "zmp-ui";
import { useParams, useNavigate } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { activeSessionAtom } from "@/store/session";
import { globalErrorAtom } from "@/store/ui";
import { useQRGenerator } from "@/hooks/useQRGenerator";
import QRDisplay from "@/components/qr/QRDisplay";
import DarkModal from "@/components/ui/DarkModal";
import { getClassById } from "@/services/class.service";
import { getActiveSessionForClass, getClassSessions } from "@/services/session.service";
import { startSession, endSession } from "@/services/session.service";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/config/firebase";
import { updateSessionLocation } from "@/services/session.service";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { ClassDoc, SessionDoc } from "@/types";

export default function TeacherSession() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);
  const setActiveSession = useSetAtom(activeSessionAtom);
  const setError = useSetAtom(globalErrorAtom);
  const [classDoc, setClassDoc] = useState<ClassDoc | null>(null);
  const [session, setSession] = useState<SessionDoc | null>(null);
  const [pastSessions, setPastSessions] = useState<SessionDoc[]>([]);
  const [starting, setStarting] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [ending, setEnding] = useState(false);
  const { location: gpsLocation, loading: gpsLoading, requestLocation } = useGeolocation();
  const [locationSet, setLocationSet] = useState(false);

  const { qrDataURL, secondsLeft, refreshSeconds } = useQRGenerator(
    session?.status === "active" && user
      ? {
          type: "teacher",
          sessionId: session.id,
          userId: user.id,
          secret: session.hmacSecret,
          refreshIntervalMs: session.qrRefreshInterval * 1000,
        }
      : null
  );

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
    getClassSessions(classId).then((all) => {
      setPastSessions(all.filter((s) => s.status === "ended"));
    });
  }, [classId]);

  const handleStart = async () => {
    if (!classDoc || !user) return;
    setStarting(true);
    try {
      const newSession = await startSession(classDoc.id, classDoc.name, user.id);
      setSession(newSession);
      setActiveSession(newSession);
    } catch {
      setError("Không thể bắt đầu phiên điểm danh");
    } finally {
      setStarting(false);
    }
  };

  const handleEnd = async () => {
    if (!session) return;
    setEnding(true);
    try {
      await endSession(session.id);
      const calculateTrustScores = httpsCallable(functions, "calculateTrustScores");
      await calculateTrustScores({ sessionId: session.id }).catch(() => {});
      const endedSession = { ...session, status: "ended" as const, endedAt: Date.now() };
      setSession(null);
      setActiveSession(null);
      setPastSessions((prev) => [endedSession, ...prev]);
      setShowEndConfirm(false);
      navigate(`/teacher/review/${session.id}`);
    } catch {
      setError("Không thể kết thúc phiên. Vui lòng thử lại.");
    } finally {
      setEnding(false);
    }
  };

  if (!classDoc) {
    return (
      <Page className="page" style={{ background: "#f2f2f7" }}>
        <Header title="Phiên điểm danh" />
        <div className="space-y-3">
          <div className="skeleton" style={{ height: 60, borderRadius: 20 }} />
          <div className="skeleton" style={{ height: 300, borderRadius: 20 }} />
        </div>
      </Page>
    );
  }

  return (
    <Page className="page" style={{ background: "#f2f2f7" }}>
      <Header title={classDoc.name} />

      {/* Class info chip */}
      <div className="flex items-center space-x-2 mb-4">
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 10px",
            borderRadius: 8,
            background: "#f0f0f5",
            color: "#6b7280",
            fontSize: 12,
            fontFamily: "monospace",
            fontWeight: 600,
          }}
        >
          {classDoc.code}
        </span>
        <span style={{ color: "#9ca3af", fontSize: 12 }}>{classDoc.studentIds.length} sinh viên</span>
      </div>

      {!session || session.status === "ended" ? (
        /* No active session */
        <div className="empty-state" style={{ paddingTop: 40, paddingBottom: 40 }}>
          <div
            className="animate-float"
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              background: "rgba(220,38,38,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
              <rect x="6" y="4" width="24" height="28" rx="4" />
              <path d="M13 14h10M13 20h6" />
              <circle cx="18" cy="10" r="0" fill="#ef4444">
                <animate attributeName="r" values="0;2;0" dur="2s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>
          <p style={{ color: "#1a1a1a", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Sẵn sàng điểm danh</p>
          <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 20 }}>
            Bắt đầu phiên để tạo mã QR cho sinh viên
          </p>
          <button
            className="btn-primary-dark glow-green press-scale"
            style={{ padding: "12px 32px", fontSize: 15 }}
            disabled={starting}
            onClick={handleStart}
          >
            {starting ? "Đang bắt đầu..." : "Bắt đầu điểm danh"}
          </button>
        </div>
      ) : (
        /* Active session */
        <div className="space-y-4">
          {/* Active session banner */}
          <div
            className="glass-card-green animate-breathe"
            style={{
              borderRadius: 20,
              padding: 12,
              textAlign: "center",
            }}
          >
            <div className="flex items-center justify-center space-x-2">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: "#22c55e",
                  display: "inline-block",
                  animation: "pulse 2s infinite",
                }}
              />
              <span style={{ color: "#22c55e", fontSize: 14, fontWeight: 600 }}>Phiên đang hoạt động</span>
            </div>
          </div>

          {/* Rotating HMAC QR */}
          <QRDisplay
            qrDataURL={qrDataURL}
            secondsLeft={secondsLeft}
            totalSeconds={refreshSeconds}
            label="QR Giảng viên"
          />
          <p style={{ color: "#9ca3af", fontSize: 12, textAlign: "center" }}>Sinh viên quét mã này để điểm danh</p>

          {/* GPS Location setting */}
          <div
            className="card"
            style={{
              background: "#ffffff",
              borderRadius: 16,
              padding: 12,
              border: "1px solid rgba(0,0,0,0.06)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={locationSet ? "#22c55e" : "#6b7280"} strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: locationSet ? "#22c55e" : "#1a1a1a" }}>
                    {locationSet ? "Đã set vị trí" : "Vị trí lớp (tùy chọn)"}
                  </p>
                  {locationSet && gpsLocation && (
                    <p style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace" }}>
                      {gpsLocation.latitude.toFixed(5)}, {gpsLocation.longitude.toFixed(5)}
                    </p>
                  )}
                </div>
              </div>
              <button
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  border: "none",
                  background: locationSet ? "#f0f0f5" : "rgba(190,29,44,0.1)",
                  color: locationSet ? "#9ca3af" : "#ef4444",
                }}
                disabled={gpsLoading}
                onClick={async () => {
                  const loc = await requestLocation();
                  if (loc && session) {
                    await updateSessionLocation(session.id, loc);
                    setLocationSet(true);
                    setSession({ ...session, location: loc, geoFenceRadius: 200 });
                  }
                }}
              >
                {gpsLoading ? "Đang lấy..." : locationSet ? "Đã set" : "Set vị trí"}
              </button>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              className="btn-secondary-dark press-scale"
              style={{ flex: 1, padding: "10px 0" }}
              onClick={() => navigate(`/teacher/monitor/${session.id}`)}
            >
              Theo dõi
            </button>
            <button
              className="glow-red press-scale animate-glow-pulse"
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 12,
                background: "#be1d2c",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                border: "none",
                boxShadow: "0 0 20px rgba(220,38,38,0.3)",
              }}
              onClick={() => setShowEndConfirm(true)}
            >
              Kết thúc
            </button>
          </div>
        </div>
      )}

      {/* Past sessions */}
      {(!session || session.status !== "active") && pastSessions.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <p className="section-label">Phiên trước ({pastSessions.length})</p>
          {pastSessions.map((s, i) => (
            <div
              key={s.id}
              className={`hover-lift animate-stagger-${Math.min(i + 1, 10)}`}
              style={{
                background: "#ffffff",
                borderRadius: 16,
                padding: 12,
                marginBottom: 8,
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                cursor: "pointer",
              }}
              onClick={() => navigate(`/teacher/review/${s.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "#f0f0f5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
                      <circle cx="8" cy="8" r="6" />
                      <path d="M8 5v3l2 2" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ color: "#1a1a1a", fontWeight: 600, fontSize: 14 }}>
                      {new Date(s.startedAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </p>
                    <p style={{ color: "#9ca3af", fontSize: 11 }}>
                      {new Date(s.startedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      {s.endedAt && (
                        <> - {new Date(s.endedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</>
                      )}
                    </p>
                  </div>
                </div>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
                  <path d="M7 4l5 5-5 5" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm end modal */}
      <DarkModal
        visible={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        title="Kết thúc phiên?"
      >
        <div
          style={{
            background: "rgba(245,158,11,0.15)",
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <p style={{ color: "#f59e0b", fontSize: 14 }}>
            Sau khi kết thúc, hệ thống sẽ tự động tính điểm tin cậy cho tất cả sinh viên.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            className="btn-secondary-dark press-scale"
            style={{ flex: 1, padding: "10px 0" }}
            onClick={() => setShowEndConfirm(false)}
          >
            Hủy
          </button>
          <button
            className="glow-red press-scale"
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 12,
              background: "#be1d2c",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              border: "none",
              boxShadow: "0 0 20px rgba(190,29,44,0.3)",
            }}
            onClick={handleEnd}
          >
            {ending ? "Đang kết thúc..." : "Kết thúc"}
          </button>
        </div>
      </DarkModal>
    </Page>
  );
}
