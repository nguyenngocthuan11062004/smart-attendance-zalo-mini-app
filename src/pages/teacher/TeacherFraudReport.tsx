import React, { useEffect, useState } from "react";
import { Page } from "zmp-ui";
import { useParams, useNavigate } from "react-router-dom";
import { analyzeFraud, getFraudReports } from "@/services/fraud.service";
import { getClassById } from "@/services/class.service";
import type { FraudReport, SuspiciousPattern } from "@/types";

export default function TeacherFraudReport() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [classDoc, setClassDoc] = useState<{ name: string; code: string; studentCount: number } | null>(null);
  const [reports, setReports] = useState<FraudReport[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [latestResult, setLatestResult] = useState<{
    patterns: SuspiciousPattern[];
    summary: string;
  } | null>(null);

  useEffect(() => {
    if (!classId) return;
    loadData(classId);
  }, [classId]);

  async function loadData(cid: string) {
    try {
      const [cls, existingReports] = await Promise.all([
        getClassById(cid),
        getFraudReports(cid),
      ]);
      if (cls) setClassDoc({ name: cls.name, code: cls.code, studentCount: cls.studentIds.length });
      setReports(existingReports);
    } finally {
      setLoading(false);
    }
  }

  const handleAnalyze = async () => {
    if (!classId) return;
    setAnalyzing(true);
    try {
      const result = await analyzeFraud(classId);
      setLatestResult({ patterns: result.patterns, summary: result.summary });
      const updated = await getFraudReports(classId);
      setReports(updated);
    } catch {
      setLatestResult({
        patterns: [],
        summary: "Lỗi khi phân tích. Vui lòng thử lại sau.",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const severityLabel = (s: string) => s === "low" ? "Thấp" : s === "medium" ? "Trung bình" : "Cao";
  const severityColors = (s: string) => {
    if (s === "high") return { bg: "#fee2e2", text: "#ef4444", iconBg: "#fee2e2" };
    if (s === "medium") return { bg: "#fef3c7", text: "#f59e0b", iconBg: "#fef3c7" };
    return { bg: "#dcfce7", text: "#22c55e", iconBg: "#f0f0f5" };
  };

  const typeLabels: Record<string, string> = {
    always_same_peers: "Luôn cùng nhóm",
    rapid_verification: "Xác minh quá nhanh",
    low_peer_count: "Ít peer xác minh",
    face_mismatch: "Không khớp khuôn mặt",
    ai_detected: "AI phát hiện",
    location_anomaly: "Vị trí bất thường",
    simultaneous_checkin: "Thời gian check-in trùng",
  };

  const renderPatterns = (patterns: SuspiciousPattern[]) => {
    if (patterns.length === 0) {
      return (
        <div style={{
          background: "#ffffff", borderRadius: 12, padding: 24,
          border: "1px solid rgba(0,0,0,0.04)", textAlign: "center",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 24, background: "rgba(34,197,94,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />
            </svg>
          </div>
          <p style={{ color: "#22c55e", fontWeight: 600, fontSize: 15 }}>Không phát hiện gian lận</p>
          <p style={{ color: "#6b7280", fontSize: 13 }}>Dữ liệu điểm danh bình thường</p>
        </div>
      );
    }

    const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const sorted = [...patterns].sort(
      (a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2)
    );

    return sorted.map((p, i) => {
      const colors = severityColors(p.severity);
      const label = typeLabels[p.type] || p.type;
      const isHigh = p.severity === "high";

      return (
        <div
          key={i}
          style={{
            background: "#ffffff", borderRadius: 12, padding: 16,
            border: "1px solid rgba(0,0,0,0.04)",
            display: "flex", flexDirection: "column", gap: 10,
          }}
        >
          {/* Top row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: isHigh ? "#fee2e2" : "#fef3c7",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isHigh ? "#ef4444" : "#f59e0b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
              </svg>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>{label}</span>
              <div style={{
                background: colors.bg, borderRadius: 8, padding: "2px 8px",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: colors.text }}>{severityLabel(p.severity)}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p style={{ fontSize: 13, color: "#6b7280" }}>{p.description}</p>

          {/* Student pills */}
          {p.studentIds.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {p.studentIds.map((id) => (
                <div key={id} style={{
                  background: "#f0f0f5", borderRadius: 6, padding: "4px 8px",
                }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#1a1a1a" }}>{id}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <Page style={{ background: "#f2f2f7", minHeight: "100vh", padding: 0 }}>
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
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Phân tích gian lận</span>
          <button style={{
            width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.13)",
            border: "none", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
          </button>
        </div>
        <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 80, borderRadius: 12, background: "#e5e7eb", animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
          ))}
        </div>
      </Page>
    );
  }

  return (
    <Page style={{ background: "#f2f2f7", minHeight: "100vh", padding: 0 }}>
      {/* Header */}
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
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Phân tích gian lận</span>
        <button style={{
          width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.13)",
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
        </button>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Class info card */}
        <div style={{
          background: "#be1d2c", borderRadius: 16, padding: 20,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{classDoc?.name || "..."}</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
              {classDoc?.code || "..."} · {classDoc?.studentCount ?? 0} SV
            </span>
          </div>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>

        {/* Analyze button */}
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          style={{
            width: "100%", height: 48, borderRadius: 12,
            background: analyzing ? "#d4d4d4" : "#be1d2c", border: "none",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span style={{ color: "#ffffff", fontSize: 15, fontWeight: 700 }}>
            {analyzing ? "Đang phân tích..." : "Phân tích gian lận"}
          </span>
        </button>

        {/* Latest result */}
        {latestResult && (
          <>
            {/* Summary card */}
            <div style={{
              background: "#ffffff", borderRadius: 12, padding: 16,
              border: "1px solid rgba(239,68,68,0.25)",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: 1 }}>KẾT QUẢ PHÂN TÍCH</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: latestResult.patterns.length > 0 ? "#ef4444" : "#22c55e" }}>
                {latestResult.patterns.length > 0
                  ? `Phát hiện ${latestResult.patterns.length} trường hợp đáng ngờ`
                  : "Không phát hiện gian lận"}
              </span>
              <span style={{ fontSize: 13, color: "#6b7280" }}>
                Trên tổng số {classDoc?.studentCount ?? 0} sinh viên
              </span>
            </div>

            {/* Section label */}
            <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: 1 }}>CÁC MẪU PHÁT HIỆN</span>

            {renderPatterns(latestResult.patterns)}
          </>
        )}

        {/* Previous reports */}
        {reports.length > 0 && !latestResult && (
          <>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: 1 }}>
              BÁO CÁO TRƯỚC ({reports.length})
            </span>
            {reports.map((report) => (
              <div key={report.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{
                  background: "#ffffff", borderRadius: 12, padding: 16,
                  border: "1px solid rgba(0,0,0,0.04)",
                  display: "flex", flexDirection: "column", gap: 6,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>
                      {new Date(report.generatedAt).toLocaleString("vi-VN")}
                    </span>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>
                      {report.suspiciousPatterns.length} mẫu
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: "#6b7280" }}>{report.summary}</p>
                </div>
                {renderPatterns(report.suspiciousPatterns)}
              </div>
            ))}
          </>
        )}

        {/* Empty state */}
        {reports.length === 0 && !latestResult && (
          <div style={{
            background: "#ffffff", borderRadius: 16, padding: 32,
            border: "1px solid rgba(0,0,0,0.04)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 28, background: "#f0f0f5",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>Chưa có báo cáo</p>
            <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center" }}>Nhấn "Phân tích gian lận" để bắt đầu</p>
          </div>
        )}
      </div>
    </Page>
  );
}
