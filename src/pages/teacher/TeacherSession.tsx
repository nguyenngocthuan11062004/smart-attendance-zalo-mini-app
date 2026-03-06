import React, { useEffect, useState } from "react";
import { Page, Spinner } from "zmp-ui";
import { useParams, useNavigate } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { activeSessionAtom } from "@/store/session";
import { globalErrorAtom } from "@/store/ui";
import { useQRGenerator } from "@/hooks/useQRGenerator";
import DarkModal from "@/components/ui/DarkModal";
import { getClassById } from "@/services/class.service";
import { getActiveSessionForClass, getClassSessions } from "@/services/session.service";
import { startSession, endSession } from "@/services/session.service";
import { getSessionAttendance } from "@/services/attendance.service";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/config/firebase";
import { updateSessionLocation } from "@/services/session.service";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { ClassDoc, SessionDoc, AttendanceDoc } from "@/types";

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
  const [attendance, setAttendance] = useState<AttendanceDoc[]>([]);
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

  // Load attendance stats when session is active
  useEffect(() => {
    if (!session || session.status !== "active") return;
    const load = () => getSessionAttendance(session.id).then(setAttendance).catch(() => {});
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [session?.id, session?.status]);

  const presentCount = attendance.filter((a) => a.trustScore === "present").length;
  const reviewCount = attendance.filter((a) => a.trustScore === "review").length;
  const totalStudents = classDoc?.studentIds.length ?? 0;
  const absentCount = totalStudents - presentCount - reviewCount;

  const handleStart = async () => {
    if (!classDoc || !user) return;
    setStarting(true);
    try {
      const newSession = await startSession(classDoc.id, classDoc.name, user.id);
      setSession(newSession);
      setActiveSession(newSession);
    } catch {
      setError("Khong the bat dau phien diem danh");
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
      setError("Khong the ket thuc phien. Vui long thu lai.");
    } finally {
      setEnding(false);
    }
  };

  // Set GPS on session start
  useEffect(() => {
    if (session?.status === "active" && !locationSet && !session.location) {
      requestLocation().then(async (loc) => {
        if (loc && session) {
          await updateSessionLocation(session.id, loc).catch(() => {});
          setLocationSet(true);
          setSession({ ...session, location: loc, geoFenceRadius: 200 });
        }
      });
    }
    if (session?.location) setLocationSet(true);
  }, [session?.id]);

  if (!classDoc) {
    return (
      <Page style={{ background: "#f8f9fa", minHeight: "100vh", padding: 0 }}>
        <div style={{
          background: "#be1d2c", borderRadius: "0 0 24px 24px",
          padding: "calc(var(--zaui-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 14px) 16px 14px",
          height: 64, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Phien diem danh</span>
        </div>
        <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="skeleton" style={{ height: 80, borderRadius: 24 }} />
          <div className="skeleton" style={{ height: 280, borderRadius: 24 }} />
        </div>
      </Page>
    );
  }

  const isActive = session?.status === "active";

  return (
    <Page style={{ background: "#f8f9fa", minHeight: "100vh", padding: 0 }}>
      {/* Header with rounded bottom */}
      <div style={{
        background: "#be1d2c", borderRadius: "0 0 24px 24px",
        padding: "calc(var(--zaui-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 14px) 16px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button onClick={() => navigate(-1)} style={{
          width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.13)",
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Phien diem danh</span>
        <button style={{
          width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.13)",
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
        </button>
      </div>

      <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Course info card */}
        <div style={{
          background: "#fff", borderRadius: 24, padding: 20,
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            <span style={{ color: "#111827", fontSize: 18, fontWeight: 800 }}>{classDoc.name}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                background: "#f0f0f5", borderRadius: 8, padding: "4px 10px",
                fontSize: 11, fontWeight: 600, color: "#374151",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16M4 12h16M4 20h16" /></svg>
                {classDoc.code}
              </span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                background: "#f0f0f5", borderRadius: 8, padding: "4px 10px",
                fontSize: 11, fontWeight: 600, color: "#374151",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                </svg>
                {totalStudents} SV
              </span>
            </div>
          </div>
          {/* Live badge */}
          {isActive && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 20,
                background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: 7,
                  background: "#22c55e",
                  boxShadow: "0 0 8px rgba(34,197,94,0.6)",
                  animation: "pulse 1.5s infinite",
                }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#22c55e", letterSpacing: 1 }}>LIVE</span>
            </div>
          )}
        </div>

        {!isActive ? (
          /* No active session — start screen */
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "40px 0",
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: 40,
              background: "rgba(190,29,44,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3M17 17h3v3M14 20h3" />
              </svg>
            </div>
            <p style={{ color: "#111827", fontSize: 18, fontWeight: 700 }}>San sang diem danh</p>
            <p style={{ color: "#6b7280", fontSize: 14 }}>Bat dau phien de tao ma QR cho sinh vien</p>
            <button
              disabled={starting}
              onClick={handleStart}
              style={{
                height: 52, borderRadius: 16, padding: "0 32px",
                background: starting ? "#d4d4d4" : "linear-gradient(180deg, #be1d2c, #dc2626)",
                border: "none", color: "#fff", fontSize: 15, fontWeight: 700,
                boxShadow: "0 4px 12px rgba(190,29,44,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {starting ? <Spinner /> : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
              {starting ? "Dang bat dau..." : "Bat dau diem danh"}
            </button>
          </div>
        ) : (
          /* Active session content */
          <>
            {/* QR Card */}
            <div style={{
              background: "#fff", borderRadius: 24, padding: "28px 24px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.04)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", letterSpacing: 1.5 }}>QR CODE DIEM DANH</span>
              {/* QR placeholder / image */}
              <div style={{
                width: 200, height: 200, borderRadius: 20,
                background: "#fafafa", border: "1px solid #e5e7eb",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden",
              }}>
                {qrDataURL ? (
                  <img src={qrDataURL} alt="QR" style={{ width: 180, height: 180 }} />
                ) : (
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="1.5" strokeLinecap="round">
                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3M17 17h3v3M14 20h3" />
                  </svg>
                )}
              </div>
              {/* Timer */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                </svg>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#be1d2c" }}>Xoay sau {secondsLeft}s</span>
              </div>
            </div>

            {/* GPS Card */}
            <div style={{
              background: "#fff", borderRadius: 20, padding: 16,
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              border: "1px solid rgba(0,0,0,0.04)",
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                background: "rgba(190,29,44,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Vi tri hien tai</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#6b7280" }}>
                  {locationSet && gpsLocation
                    ? `${gpsLocation.latitude.toFixed(4)}° N, ${gpsLocation.longitude.toFixed(4)}° E`
                    : gpsLoading ? "Dang lay vi tri..." : "Chua co vi tri"}
                </span>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 12 }}>
              {/* Present */}
              <div style={{
                flex: 1, borderRadius: 20, padding: "14px 10px",
                background: "linear-gradient(180deg, #f0fdf4, #fff)",
                border: "1px solid rgba(34,197,94,0.12)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: "rgba(34,197,94,0.09)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg>
                </div>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#22c55e" }}>{presentCount}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: "#6b7280" }}>Co mat</span>
              </div>
              {/* Review */}
              <div style={{
                flex: 1, borderRadius: 20, padding: "14px 10px",
                background: "linear-gradient(180deg, #fffbeb, #fff)",
                border: "1px solid rgba(245,158,11,0.12)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: "rgba(245,158,11,0.09)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                </div>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b" }}>{reviewCount}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: "#6b7280" }}>Xem xet</span>
              </div>
              {/* Absent */}
              <div style={{
                flex: 1, borderRadius: 20, padding: "14px 10px",
                background: "linear-gradient(180deg, #fef2f2, #fff)",
                border: "1px solid rgba(239,68,68,0.12)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: "rgba(239,68,68,0.09)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" /></svg>
                </div>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#ef4444" }}>{Math.max(0, absentCount)}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: "#6b7280" }}>Vang</span>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <button
                onClick={() => navigate(`/teacher/monitor/${session.id}`)}
                style={{
                  height: 52, borderRadius: 16,
                  background: "#fff", border: "1px solid #e5e7eb",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                </svg>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#374151" }}>Theo doi</span>
              </button>
              <button
                onClick={() => setShowEndConfirm(true)}
                style={{
                  height: 52, borderRadius: 16,
                  background: "linear-gradient(180deg, #be1d2c, #dc2626)",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(190,29,44,0.19)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Ket thuc</span>
              </button>
            </div>
          </>
        )}

        {/* Past sessions (when no active session) */}
        {!isActive && pastSessions.length > 0 && (
          <>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: 1 }}>PHIEN TRUOC ({pastSessions.length})</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pastSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/teacher/review/${s.id}`)}
                  style={{
                    background: "#fff", borderRadius: 16, padding: 14,
                    border: "none", width: "100%", textAlign: "left",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, background: "#f0f0f5",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                      </svg>
                    </div>
                    <div>
                      <p style={{ color: "#1a1a1a", fontWeight: 600, fontSize: 14 }}>
                        {new Date(s.startedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </p>
                      <p style={{ color: "#9ca3af", fontSize: 11 }}>
                        {new Date(s.startedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        {s.endedAt && ` - ${new Date(s.endedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`}
                      </p>
                    </div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Confirm end modal */}
      <DarkModal
        visible={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        title="Ket thuc phien?"
      >
        <div style={{
          background: "rgba(245,158,11,0.1)", borderRadius: 12, padding: 12, marginBottom: 16,
        }}>
          <p style={{ color: "#f59e0b", fontSize: 14 }}>
            Sau khi ket thuc, he thong se tu dong tinh diem tin cay cho tat ca sinh vien.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => setShowEndConfirm(false)}
            style={{
              flex: 1, height: 48, borderRadius: 12,
              background: "#f0f0f5", border: "none",
              fontSize: 15, fontWeight: 600, color: "#6b7280",
            }}
          >
            Huy
          </button>
          <button
            disabled={ending}
            onClick={handleEnd}
            style={{
              flex: 1, height: 48, borderRadius: 12,
              background: ending ? "#d4d4d4" : "#be1d2c", border: "none",
              fontSize: 15, fontWeight: 700, color: "#fff",
            }}
          >
            {ending ? "Dang ket thuc..." : "Ket thuc"}
          </button>
        </div>
      </DarkModal>
    </Page>
  );
}
