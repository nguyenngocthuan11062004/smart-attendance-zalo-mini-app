import React, { useEffect, useState } from "react";
import { Page, Box, Text, Button, Modal, Header } from "zmp-ui";
import { useParams, useNavigate } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { activeSessionAtom } from "@/store/session";
import { generateQRDataURL } from "@/services/qr.service";
import { getClassById } from "@/services/class.service";
import { getActiveSessionForClass, getClassSessions } from "@/services/session.service";
import { startSession, endSession } from "@/services/session.service";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/config/firebase";
import type { ClassDoc, SessionDoc } from "@/types";

export default function TeacherSession() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);
  const setActiveSession = useSetAtom(activeSessionAtom);
  const [classDoc, setClassDoc] = useState<ClassDoc | null>(null);
  const [session, setSession] = useState<SessionDoc | null>(null);
  const [pastSessions, setPastSessions] = useState<SessionDoc[]>([]);
  const [starting, setStarting] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [ending, setEnding] = useState(false);
  const [qrDataURL, setQrDataURL] = useState("");

  // Generate static QR for active session
  useEffect(() => {
    if (session?.status === "active") {
      const content = JSON.stringify({ type: "teacher", sessionId: session.id });
      generateQRDataURL(content).then(setQrDataURL);
    }
  }, [session?.id, session?.status]);

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
    } finally {
      setEnding(false);
    }
  };

  if (!classDoc) {
    return (
      <Page className="page">
        <Header title="Phien diem danh" />
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
        <span className="text-xs text-gray-400">{classDoc.studentIds.length} sinh vien</span>
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
          <Text bold size="large" className="text-gray-700 mb-1">San sang diem danh</Text>
          <Text size="small" className="text-gray-400 mb-5">
            Bat dau phien de tao ma QR cho sinh vien
          </Text>
          <Button variant="primary" size="large" loading={starting} onClick={handleStart}>
            Bat dau diem danh
          </Button>
        </div>
      ) : (
        /* Active session */
        <div className="space-y-4">
          <div className="gradient-green rounded-2xl p-3 text-center text-white">
            <div className="flex items-center justify-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-sm font-semibold">Phien dang hoat dong</span>
            </div>
          </div>

          {/* Static QR */}
          <div className="flex flex-col items-center">
            <p className="text-sm font-semibold text-gray-500 mb-3">QR Giang vien</p>
            <div className="card-flat p-5">
              {qrDataURL ? (
                <img src={qrDataURL} alt="QR Code" className="w-56 h-56" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center">
                  <div className="skeleton w-56 h-56" />
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">Sinh vien quet ma nay de diem danh</p>
          </div>

          <div className="flex space-x-3">
            <Button
              className="flex-1"
              variant="secondary"
              onClick={() => navigate(`/teacher/monitor/${session.id}`)}
            >
              Theo doi
            </Button>
            <button
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm active:bg-red-600"
              onClick={() => setShowEndConfirm(true)}
            >
              Ket thuc
            </button>
          </div>
        </div>
      )}

      {/* Past sessions */}
      {(!session || session.status !== "active") && pastSessions.length > 0 && (
        <div className="mt-6">
          <p className="section-label">Phien truoc ({pastSessions.length})</p>
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
        title="Ket thuc phien?"
      >
        <Box className="p-4">
          <div className="bg-amber-50 rounded-xl p-3 mb-4">
            <Text size="small" className="text-amber-800">
              Sau khi ket thuc, he thong se tu dong tinh diem tin cay cho tat ca sinh vien.
            </Text>
          </div>
          <div className="flex space-x-3">
            <Button
              className="flex-1"
              variant="secondary"
              onClick={() => setShowEndConfirm(false)}
            >
              Huy
            </Button>
            <button
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm active:bg-red-600"
              onClick={handleEnd}
            >
              {ending ? "Dang ket thuc..." : "Ket thuc"}
            </button>
          </div>
        </Box>
      </Modal>
    </Page>
  );
}
