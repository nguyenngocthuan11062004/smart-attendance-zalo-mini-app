import React, { useEffect, useState } from "react";
import { Page, Box, Text, Button, Header } from "zmp-ui";
import { useParams, useNavigate } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { activeSessionAtom } from "@/store/session";
import { globalErrorAtom } from "@/store/ui";
import { subscribeToSessionAttendance } from "@/services/attendance.service";
import { getSession, endSession } from "@/services/session.service";
import { getClassById } from "@/services/class.service";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/config/firebase";
import AttendanceCard from "@/components/attendance/AttendanceCard";
import ScoreRing from "@/components/ui/ScoreRing";
import DarkStatCard from "@/components/ui/DarkStatCard";
import DarkModal from "@/components/ui/DarkModal";
import type { AttendanceDoc } from "@/types";

type FilterType = "all" | "present" | "review" | "absent";

export default function TeacherMonitor() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const session = useAtomValue(activeSessionAtom);
  const setActiveSession = useSetAtom(activeSessionAtom);
  const setError = useSetAtom(globalErrorAtom);
  const [records, setRecords] = useState<AttendanceDoc[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    getSession(sessionId).then((sess) => {
      if (sess) {
        getClassById(sess.classId).then((cls) => {
          if (cls) setTotalStudents(cls.studentIds.length);
        });
      }
    });

    const unsubscribe = subscribeToSessionAttendance(sessionId, (data) => {
      setRecords(data.sort((a, b) => b.checkedInAt - a.checkedInAt));
    });
    return () => unsubscribe();
  }, [sessionId]);

  const present = records.filter((r) => r.trustScore === "present").length;
  const review = records.filter((r) => r.trustScore === "review").length;
  const checkedIn = records.length;
  const absentCount = totalStudents > 0 ? totalStudents - checkedIn : 0;
  const progressPercent = totalStudents > 0 ? Math.round((checkedIn / totalStudents) * 100) : 0;

  const filteredRecords = records.filter((r) => {
    if (filter === "all") return true;
    if (filter === "present") return r.trustScore === "present";
    if (filter === "review") return r.trustScore === "review";
    if (filter === "absent") return r.trustScore === "absent";
    return true;
  });

  const handleEndSession = async () => {
    if (!sessionId) return;
    setEnding(true);
    try {
      await endSession(sessionId);
      const calculateTrustScores = httpsCallable(functions, "calculateTrustScores");
      await calculateTrustScores({ sessionId }).catch(() => {});
      setActiveSession(null);
      navigate(`/teacher/review/${sessionId}`);
    } catch {
      setError("Không thể kết thúc phiên. Vui lòng thử lại.");
    } finally {
      setEnding(false);
      setShowEndConfirm(false);
    }
  };

  const filterButtons: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "Tất cả", count: checkedIn },
    { key: "present", label: "Có mặt", count: present },
    { key: "review", label: "Xem xét", count: review },
    { key: "absent", label: "Vắng", count: records.filter((r) => r.trustScore === "absent").length },
  ];

  return (
    <Page className="page" style={{ background: "#f2f2f7" }}>
      <Header title="Theo dõi điểm danh" />

      {/* Progress section with ScoreRing */}
      {totalStudents > 0 && (
        <div
          className="glass-card"
          style={{
            borderRadius: 20,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span style={{ color: "#1a1a1a", fontSize: 20, fontWeight: 700 }}>{checkedIn}</span>
                <span style={{ color: "#9ca3af", fontSize: 13 }}>/ {totalStudents} sinh viên</span>
              </div>
              {session?.status === "active" && (
                <div className="flex items-center space-x-1" style={{ marginTop: 4 }}>
                  <span
                    className="animate-breathe"
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      background: "#22c55e",
                      display: "inline-block",
                    }}
                  />
                  <span style={{ color: "#22c55e", fontSize: 11, fontWeight: 500 }}>Realtime</span>
                </div>
              )}
            </div>
            <ScoreRing percentage={progressPercent} size={64} color="#a78bfa" glow animated>
              <span style={{ color: "#a78bfa", fontSize: 13, fontWeight: 700 }}>{progressPercent}%</span>
            </ScoreRing>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="animate-bounce-in animate-stagger-1">
          <DarkStatCard value={present} label="Có mặt" color="#22c55e" enhanced />
        </div>
        <div className="animate-bounce-in animate-stagger-2">
          <DarkStatCard value={review} label="Xem xét" color="#f59e0b" enhanced />
        </div>
        <div className="animate-bounce-in animate-stagger-3">
          <DarkStatCard value={absentCount} label="Vắng" color="#ef4444" enhanced />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex space-x-2 mb-3 overflow-x-auto pb-1">
        {filterButtons.map((f) => (
          <button
            key={f.key}
            className={`filter-chip state-transition ${filter === f.key ? "active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* List header */}
      <div className="flex justify-between items-center mb-3">
        <p style={{ color: "#1a1a1a", fontWeight: 600, fontSize: 15 }}>Danh sách ({filteredRecords.length})</p>
      </div>

      {/* Records list */}
      {filteredRecords.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: 32, paddingBottom: 32 }}>
          <p style={{ color: "#9ca3af", fontSize: 14 }}>
            {filter === "all" ? "Chưa có sinh viên điểm danh" : "Không có sinh viên"}
          </p>
        </div>
      ) : (
        filteredRecords.map((r, i) => (
          <div key={r.id} className={`animate-slide-up animate-stagger-${Math.min(i + 1, 10)}`}>
            <AttendanceCard record={r} />
          </div>
        ))
      )}

      {/* End session button */}
      {session?.status === "active" && (
        <div style={{ marginTop: 16, paddingBottom: 16 }}>
          <button
            className="glow-red press-scale"
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 12,
              background: "#be1d2c",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              border: "none",
              boxShadow: "0 0 20px rgba(190,29,44,0.3)",
            }}
            onClick={() => setShowEndConfirm(true)}
          >
            Kết thúc phiên điểm danh
          </button>
        </div>
      )}

      {/* Confirm modal */}
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
            marginBottom: 12,
          }}
        >
          <p style={{ color: "#f59e0b", fontSize: 14 }}>
            Đã có {checkedIn}/{totalStudents} sinh viên check-in. Hệ thống sẽ tính điểm tin cậy sau khi kết thúc.
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
            onClick={handleEndSession}
          >
            {ending ? "Đang kết thúc..." : "Kết thúc"}
          </button>
        </div>
      </DarkModal>
    </Page>
  );
}
