import React, { useEffect, useState } from "react";
import { Page, Box, Text, Button, Modal, Header } from "zmp-ui";
import { useParams, useNavigate } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { activeSessionAtom } from "@/store/session";
import { globalErrorAtom } from "@/store/ui";
import { useQRGenerator } from "@/hooks/useQRGenerator";
import QRDisplay from "@/components/qr/QRDisplay";
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
      <Page className="page">
        <Header title="Phiên điểm danh" />
        <div className="space-y-3">
          <div className="skeleton h-[60px] rounded-2xl" />
          <div className="skeleton h-[300px] rounded-2xl" />
        </div>
      </Page>
    );
  }

  return (
    <Page className="page">
      <Header title={classDoc.name} />

      {/* Class info chip */}
      <div className="flex items-center space-x-2 mb-4">
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-xs text-gray-500 font-mono font-semibold">
          {classDoc.code}
        </span>
        <span className="text-xs text-gray-400">{classDoc.studentIds.length} sinh viên</span>
      </div>

      {!session || session.status === "ended" ? (
        /* No active session */
        <div className="empty-state py-10">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
              <rect x="6" y="4" width="24" height="28" rx="4" />
              <path d="M13 14h10M13 20h6" />
              <circle cx="18" cy="10" r="0" fill="#ef4444">
                <animate attributeName="r" values="0;2;0" dur="2s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>
          <Text bold size="large" className="text-gray-700 mb-1">Sẵn sàng điểm danh</Text>
          <Text size="small" className="text-gray-400 mb-5">
            Bắt đầu phiên để tạo mã QR cho sinh viên
          </Text>
          <Button variant="primary" size="large" loading={starting} onClick={handleStart}>
            Bắt đầu điểm danh
          </Button>
        </div>
      ) : (
        /* Active session */
        <div className="space-y-4">
          <div className="gradient-green rounded-2xl p-3 text-center text-white">
            <div className="flex items-center justify-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-sm font-semibold">Phiên đang hoạt động</span>
            </div>
          </div>

          {/* Rotating HMAC QR */}
          <QRDisplay
            qrDataURL={qrDataURL}
            secondsLeft={secondsLeft}
            totalSeconds={refreshSeconds}
            label="QR Giảng viên"
          />
          <p className="text-xs text-gray-400 text-center">Sinh viên quét mã này để điểm danh</p>

          {/* GPS Location setting */}
          <div className="card-flat p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={locationSet ? "#10b981" : "#94a3b8"} strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                <div>
                  <Text size="small" bold className={locationSet ? "text-emerald-600" : "text-gray-600"}>
                    {locationSet ? "Đã set vị trí" : "Vị trí lớp (tùy chọn)"}
                  </Text>
                  {locationSet && gpsLocation && (
                    <Text size="xxSmall" className="text-gray-400">
                      {gpsLocation.latitude.toFixed(5)}, {gpsLocation.longitude.toFixed(5)}
                    </Text>
                  )}
                </div>
              </div>
              <button
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  locationSet
                    ? "bg-gray-100 text-gray-500"
                    : "bg-red-50 text-red-500 active:bg-red-100"
                }`}
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
            <Button
              className="flex-1"
              variant="secondary"
              onClick={() => navigate(`/teacher/monitor/${session.id}`)}
            >
              Theo dõi
            </Button>
            <button
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm active:bg-red-600"
              onClick={() => setShowEndConfirm(true)}
            >
              Kết thúc
            </button>
          </div>
        </div>
      )}

      {/* Past sessions */}
      {(!session || session.status !== "active") && pastSessions.length > 0 && (
        <div className="mt-6">
          <p className="section-label">Phiên trước ({pastSessions.length})</p>
          {pastSessions.map((s) => (
            <div
              key={s.id}
              className="card-flat p-3 mb-2 active:bg-gray-50"
              onClick={() => navigate(`/teacher/review/${s.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round">
                      <circle cx="8" cy="8" r="6" />
                      <path d="M8 5v3l2 2" />
                    </svg>
                  </div>
                  <div>
                    <Text bold size="normal">
                      {new Date(s.startedAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </Text>
                    <Text size="xxSmall" className="text-gray-400">
                      {new Date(s.startedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      {s.endedAt && (
                        <> - {new Date(s.endedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</>
                      )}
                    </Text>
                  </div>
                </div>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round">
                  <path d="M7 4l5 5-5 5" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm end modal */}
      <Modal
        visible={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        title="Kết thúc phiên?"
      >
        <Box className="p-4">
          <div className="bg-amber-50 rounded-xl p-3 mb-4">
            <Text size="small" className="text-amber-800">
              Sau khi kết thúc, hệ thống sẽ tự động tính điểm tin cậy cho tất cả sinh viên.
            </Text>
          </div>
          <div className="flex space-x-3">
            <Button
              className="flex-1"
              variant="secondary"
              onClick={() => setShowEndConfirm(false)}
            >
              Hủy
            </Button>
            <button
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm active:bg-red-600"
              onClick={handleEnd}
            >
              {ending ? "Đang kết thúc..." : "Kết thúc"}
            </button>
          </div>
        </Box>
      </Modal>
    </Page>
  );
}
