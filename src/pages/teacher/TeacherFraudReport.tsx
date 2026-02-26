import React, { useEffect, useState } from "react";
import { Page, Box, Text, Button, Header } from "zmp-ui";
import { useParams } from "react-router-dom";
import { analyzeFraud, getFraudReports } from "@/services/fraud.service";
import { getClassById } from "@/services/class.service";
import type { FraudReport, SuspiciousPattern } from "@/types";

export default function TeacherFraudReport() {
  const { classId } = useParams<{ classId: string }>();
  const [className, setClassName] = useState("");
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
      if (cls) setClassName(cls.name);
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

  const severityConfig = {
    low: { bg: "rgba(107,114,128,0.15)", text: "#9ca3af", dot: "#6b7280", border: "#6b7280" },
    medium: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b", dot: "#f59e0b", border: "#f59e0b" },
    high: { bg: "rgba(239,68,68,0.15)", text: "#ef4444", dot: "#ef4444", border: "#ef4444" },
  };

  const typeIcons: Record<string, string> = {
    always_same_peers: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
    rapid_verification: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
    low_peer_count: "M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181",
    face_mismatch: "M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z",
    ai_detected: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z",
  };

  const typeLabels: Record<string, string> = {
    always_same_peers: "Luôn cùng nhóm",
    rapid_verification: "Xác minh quá nhanh",
    low_peer_count: "Ít peer xác minh",
    face_mismatch: "Không khớp khuôn mặt",
    ai_detected: "AI phát hiện",
  };

  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

  const renderPatterns = (patterns: SuspiciousPattern[]) => {
    if (patterns.length === 0) {
      return (
        <div
          style={{
            background: "#ffffff",
            borderRadius: 16,
            padding: 16,
            textAlign: "center",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <div
            className="animate-success-pop"
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              background: "rgba(34,197,94,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 8px",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p style={{ color: "#22c55e", fontWeight: 600 }}>Không phát hiện gian lận</p>
          <p style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>Dữ liệu điểm danh bình thường</p>
        </div>
      );
    }

    const sorted = [...patterns].sort(
      (a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2)
    );

    return sorted.map((p, i) => {
      const severity = severityConfig[p.severity];
      const iconPath = typeIcons[p.type] || typeIcons.ai_detected;
      const label = typeLabels[p.type] || p.type;

      return (
        <div
          key={i}
          className={`animate-slide-up animate-stagger-${Math.min(i + 1, 10)} ${p.severity === "high" ? "glow-red" : p.severity === "medium" ? "glow-amber" : ""}`}
          style={{
            background: "#ffffff",
            borderRadius: 16,
            padding: 12,
            marginBottom: 8,
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            borderLeft: `4px solid ${severity.border}`,
          }}
        >
          <div className="flex items-start">
            <div
              className="animate-breathe"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: severity.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={severity.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={iconPath} />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p style={{ color: "#1a1a1a", fontWeight: 600, fontSize: 13 }}>{label}</p>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "2px 6px",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    background: severity.bg,
                    color: severity.text,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      background: severity.dot,
                      marginRight: 4,
                      display: "inline-block",
                    }}
                  />
                  {p.severity === "low" ? "Thấp" : p.severity === "medium" ? "TB" : "Cao"}
                </span>
              </div>
              <p style={{ color: "#6b7280", fontSize: 11 }}>{p.description}</p>
              {p.studentIds.length > 0 && (
                <div className="flex flex-wrap gap-1" style={{ marginTop: 6 }}>
                  {p.studentIds.map((id) => (
                    <span
                      key={id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "#f0f0f5",
                        color: "#6b7280",
                        fontSize: 10,
                        fontFamily: "monospace",
                        border: "1px solid rgba(0,0,0,0.06)",
                      }}
                    >
                      {id}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    });
  };

  if (loading) {
    return (
      <Page className="page" style={{ background: "#f2f2f7" }}>
        <Header title="Phân tích gian lận" />
        <div className="space-y-3">
          <div className="skeleton" style={{ height: 48, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 120, borderRadius: 20 }} />
        </div>
      </Page>
    );
  }

  return (
    <Page className="page" style={{ background: "#f2f2f7" }}>
      <Header title="Phân tích gian lận" />

      {/* Class info - dark card */}
      <div
        className="glass-card animate-fade-in"
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f0f0f5 100%)",
          borderRadius: 20,
          padding: 16,
          marginBottom: 16,
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <p style={{ color: "#9ca3af", fontSize: 12, fontWeight: 500 }}>{className}</p>
        <p style={{ color: "#1a1a1a", fontSize: 18, fontWeight: 700, marginTop: 2 }}>Phát hiện gian lận</p>
        <p style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>Phân tích dữ liệu điểm danh để tìm mẫu đáng ngờ</p>
      </div>

      {/* Analyze button */}
      <button
        className={analyzing ? "" : "glow-red press-scale"}
        style={{
          width: "100%",
          padding: "12px 0",
          borderRadius: 12,
          fontWeight: 600,
          fontSize: 14,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          border: "none",
          background: analyzing ? "#f0f0f5" : "#be1d2c",
          color: analyzing ? "#9ca3af" : "#ffffff",
          boxShadow: analyzing ? "none" : "0 0 20px rgba(190,29,44,0.3)",
        }}
        onClick={handleAnalyze}
        disabled={analyzing}
      >
        {analyzing ? (
          <>
            <svg className="animate-spin" style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none">
              <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Đang phân tích...</span>
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <span>Phân tích gian lận</span>
          </>
        )}
      </button>

      {/* Latest result */}
      {latestResult && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              padding: 12,
              marginBottom: 12,
              border: "1px solid rgba(0,0,0,0.06)",
              borderLeft: "4px solid #ef4444",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <p style={{ color: "#6b7280", fontSize: 14 }}>{latestResult.summary}</p>
          </div>
          {renderPatterns(latestResult.patterns)}
        </div>
      )}

      {/* Previous reports */}
      {reports.length > 0 && !latestResult && (
        <div>
          <p className="section-label">Báo cáo trước ({reports.length})</p>
          {reports.map((report) => (
            <div key={report.id} style={{ marginBottom: 16 }}>
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: 16,
                  padding: 12,
                  marginBottom: 8,
                  border: "1px solid rgba(0,0,0,0.06)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                <div className="flex items-center justify-between">
                  <p style={{ color: "#6b7280", fontSize: 11 }}>
                    {new Date(report.generatedAt).toLocaleString("vi-VN")}
                  </p>
                  <span style={{ color: "#6b7280", fontSize: 10 }}>
                    {report.suspiciousPatterns.length} mẫu
                  </span>
                </div>
                <p style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>{report.summary}</p>
              </div>
              {renderPatterns(report.suspiciousPatterns)}
            </div>
          ))}
        </div>
      )}

      {reports.length === 0 && !latestResult && (
        <div className="empty-state" style={{ paddingTop: 32, paddingBottom: 32 }}>
          <div
            className="animate-float"
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              background: "#f0f0f5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
              <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <p style={{ color: "#1a1a1a", fontWeight: 600, marginBottom: 4 }}>Chưa có báo cáo</p>
          <p style={{ color: "#9ca3af", fontSize: 12 }}>Nhấn "Phân tích gian lận" để bắt đầu</p>
        </div>
      )}
    </Page>
  );
}
