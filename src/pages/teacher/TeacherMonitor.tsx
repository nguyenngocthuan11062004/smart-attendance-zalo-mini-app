import React, { useEffect, useState } from "react";
import { Page, Box, Text, Button, Modal, Header } from "zmp-ui";
import { useParams, useNavigate } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { activeSessionAtom } from "@/store/session";
import { subscribeToSessionAttendance } from "@/services/attendance.service";
import { getSession, endSession } from "@/services/session.service";
import { getClassById } from "@/services/class.service";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/config/firebase";
import AttendanceCard from "@/components/attendance/AttendanceCard";
import type { AttendanceDoc } from "@/types";

type FilterType = "all" | "present" | "review" | "absent";

export default function TeacherMonitor() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const session = useAtomValue(activeSessionAtom);
  const setActiveSession = useSetAtom(activeSessionAtom);
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
    } finally {
      setEnding(false);
      setShowEndConfirm(false);
    }
  };

  const filterButtons: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "Tat ca", count: checkedIn },
    { key: "present", label: "Co mat", count: present },
    { key: "review", label: "Xem xet", count: review },
    { key: "absent", label: "Vang", count: records.filter((r) => r.trustScore === "absent").length },
  ];

  return (
    <Page className="page">
      <Header title="Theo doi diem danh" />

      {/* Progress section */}
      {totalStudents > 0 && (
        <div className="card-flat p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center space-x-2">
              <Text bold size="normal">{checkedIn}</Text>
              <Text size="xSmall" className="text-gray-400">/ {totalStudents} sinh vien</Text>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600">
              {progressPercent}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className="progress-fill bg-red-500 h-2.5"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="stat-card bg-emerald-50 text-emerald-600">
          <p className="text-2xl font-bold">{present}</p>
          <p className="text-[11px] text-emerald-500 mt-0.5 font-medium">Co mat</p>
        </div>
        <div className="stat-card bg-amber-50 text-amber-600">
          <p className="text-2xl font-bold">{review}</p>
          <p className="text-[11px] text-amber-500 mt-0.5 font-medium">Xem xet</p>
        </div>
        <div className="stat-card bg-red-50 text-red-600">
          <p className="text-2xl font-bold">{absentCount}</p>
          <p className="text-[11px] text-red-500 mt-0.5 font-medium">Vang</p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex space-x-2 mb-3 overflow-x-auto pb-1">
        {filterButtons.map((f) => (
          <button
            key={f.key}
            className={`filter-chip ${filter === f.key ? "active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* List header */}
      <div className="flex justify-between items-center mb-3">
        <Text bold size="normal">Danh sach ({filteredRecords.length})</Text>
        {session?.status === "active" && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
            Realtime
          </span>
        )}
      </div>

      {/* Records list */}
      {filteredRecords.length === 0 ? (
        <div className="empty-state py-8">
          <Text size="small" className="text-gray-400">
            {filter === "all" ? "Chua co sinh vien diem danh" : "Khong co sinh vien"}
          </Text>
        </div>
      ) : (
        filteredRecords.map((r) => <AttendanceCard key={r.id} record={r} />)
      )}

      {/* End session button */}
      {session?.status === "active" && (
        <div className="mt-4 pb-4">
          <button
            className="w-full py-3 rounded-xl bg-red-500 text-white font-semibold text-sm active:bg-red-600"
            onClick={() => setShowEndConfirm(true)}
          >
            Ket thuc phien diem danh
          </button>
        </div>
      )}

      {/* Confirm modal */}
      <Modal
        visible={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        title="Ket thuc phien?"
      >
        <Box className="p-4">
          <div className="bg-amber-50 rounded-xl p-3 mb-3">
            <Text size="small" className="text-amber-800">
              Da co {checkedIn}/{totalStudents} sinh vien check-in. He thong se tinh diem tin cay sau khi ket thuc.
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
              onClick={handleEndSession}
            >
              {ending ? "Dang ket thuc..." : "Ket thuc"}
            </button>
          </div>
        </Box>
      </Modal>
    </Page>
  );
}
