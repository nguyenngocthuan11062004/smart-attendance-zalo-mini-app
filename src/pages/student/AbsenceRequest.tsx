import React, { useEffect, useState } from "react";
import { Page } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { globalErrorAtom } from "@/store/ui";
import { getStudentClasses } from "@/services/class.service";
import {
  createAbsenceRequest,
  subscribeToMyAbsenceRequests,
} from "@/services/absence.service";
import DarkModal from "@/components/ui/DarkModal";
import { haptic } from "@/utils/haptic";
import type { ClassDoc, AbsenceRequestDoc } from "@/types";

const STATUS_CONFIG: Record<
  AbsenceRequestDoc["status"],
  { label: string; color: string; bg: string }
> = {
  pending: { label: "Chờ duyệt", color: "#f59e0b", bg: "#fef3c7" },
  approved: { label: "Đã duyệt", color: "#22c55e", bg: "#dcfce7" },
  rejected: { label: "Từ chối", color: "#ef4444", bg: "#fee2e2" },
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AbsenceRequest() {
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);
  const setError = useSetAtom(globalErrorAtom);

  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [requests, setRequests] = useState<AbsenceRequestDoc[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load classes once
  useEffect(() => {
    if (!user) return;
    getStudentClasses(user.mssv || "")
      .then(setClasses)
      .catch(() => setError("Không tải được danh sách lớp"));
  }, [user, setError]);

  // Subscribe to my requests
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToMyAbsenceRequests(user.id, (records) => {
      setRequests(records);
      setLoaded(true);
    });
    return unsub;
  }, [user]);

  const handleSubmit = async () => {
    if (!user || !selectedClassId || !reason.trim()) {
      setError("Vui lòng chọn lớp và nhập lý do");
      return;
    }
    const cls = classes.find((c) => c.id === selectedClassId);
    if (!cls) return;

    setSubmitting(true);
    try {
      await createAbsenceRequest({
        studentId: user.id,
        studentName: user.name,
        classId: cls.id,
        className: cls.name,
        sessionId: "",
        reason: reason.trim(),
        attachmentPaths: [],
      });
      haptic("success");
      setShowForm(false);
      setSelectedClassId("");
      setReason("");
    } catch {
      setError("Không gửi được đơn. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  return (
    <Page style={{ background: "#f2f2f7", minHeight: "100vh", padding: 0 }}>
      {/* Header */}
      <div
        style={{
          background: "#be1d2c",
          borderRadius: "0 0 24px 24px",
          padding:
            "calc(var(--zaui-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 14px) 16px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: "rgba(255,255,255,0.13)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>
          Đơn xin nghỉ
        </span>
        <div style={{ width: 36 }} />
      </div>

      <div
        style={{
          padding: "16px 16px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Summary card */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 16,
            padding: 16,
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            display: "flex",
            gap: 12,
          }}
        >
          {[
            { label: "Chờ duyệt", count: pendingCount, color: "#f59e0b" },
            { label: "Đã duyệt", count: approvedCount, color: "#22c55e" },
            { label: "Từ chối", count: rejectedCount, color: "#ef4444" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span
                style={{ fontSize: 24, fontWeight: 700, color: s.color }}
              >
                {s.count}
              </span>
              <span style={{ fontSize: 11, color: "#6b7280" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* New request button */}
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: "100%",
            height: 48,
            borderRadius: 14,
            background: "#be1d2c",
            border: "none",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            boxShadow: "0 4px 16px rgba(190,29,44,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Gửi đơn xin nghỉ mới
        </button>

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p className="section-label">Lịch sử đơn ({requests.length})</p>

          {!loaded && (
            <>
              <div className="skeleton" style={{ height: 90, borderRadius: 12 }} />
              <div className="skeleton" style={{ height: 90, borderRadius: 12 }} />
            </>
          )}

          {loaded && requests.length === 0 && (
            <div
              className="empty-state"
              style={{ padding: "32px 0", color: "#9ca3af", textAlign: "center" }}
            >
              <p>Bạn chưa gửi đơn nào</p>
            </div>
          )}

          {requests.map((r) => {
            const cfg = STATUS_CONFIG[r.status];
            return (
              <div
                key={r.id}
                style={{
                  background: "#ffffff",
                  borderRadius: 12,
                  padding: 14,
                  border: "1px solid rgba(0,0,0,0.06)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#1a1a1a",
                      flex: 1,
                      marginRight: 8,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.className}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: cfg.bg,
                      color: cfg.color,
                      flexShrink: 0,
                    }}
                  >
                    {cfg.label}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: 13,
                    color: "#6b7280",
                    lineHeight: 1.5,
                  }}
                >
                  {r.reason}
                </p>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    color: "#9ca3af",
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <span>Gửi {formatDate(r.createdAt)}</span>
                  {r.reviewedAt && (
                    <>
                      <span style={{ margin: "0 4px" }}>·</span>
                      <span>
                        Duyệt {formatDate(r.reviewedAt)}
                      </span>
                    </>
                  )}
                </div>

                {r.reviewNote && (
                  <p
                    style={{
                      fontSize: 12,
                      color: "#374151",
                      background: "#f8f9fa",
                      borderRadius: 8,
                      padding: "8px 10px",
                      marginTop: 2,
                    }}
                  >
                    <strong>Ghi chú GV:</strong> {r.reviewNote}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form modal */}
      <DarkModal
        visible={showForm}
        onClose={() => !submitting && setShowForm(false)}
        title="Gửi đơn xin nghỉ"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Class picker */}
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
                display: "block",
              }}
            >
              Lớp <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={submitting}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.1)",
                padding: "0 12px",
                fontSize: 14,
                color: "#1a1a1a",
                background: "#fff",
              }}
            >
              <option value="">-- Chọn lớp --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
                display: "block",
              }}
            >
              Lý do <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              maxLength={500}
              rows={4}
              placeholder="VD: Em bị ốm có giấy khám bệnh kèm theo..."
              style={{
                width: "100%",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.1)",
                padding: 12,
                fontSize: 14,
                color: "#1a1a1a",
                background: "#fff",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
            <p
              style={{
                fontSize: 11,
                color: "#9ca3af",
                marginTop: 4,
                textAlign: "right",
              }}
            >
              {reason.length}/500
            </p>
          </div>

          <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
            Đơn của bạn sẽ được giảng viên/phòng đào tạo xem xét. Bạn sẽ thấy
            trạng thái cập nhật ở trang này.
          </p>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setShowForm(false)}
              disabled={submitting}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 10,
                background: "#f0f0f5",
                border: "none",
                fontSize: 14,
                fontWeight: 600,
                color: "#6b7280",
              }}
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedClassId || !reason.trim()}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 10,
                background:
                  submitting || !selectedClassId || !reason.trim()
                    ? "#d4d4d4"
                    : "#be1d2c",
                border: "none",
                fontSize: 14,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              {submitting ? "Đang gửi..." : "Gửi đơn"}
            </button>
          </div>
        </div>
      </DarkModal>
    </Page>
  );
}
