import React, { useState, useEffect, useCallback } from "react";
import { Page, Avatar } from "zmp-ui";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router-dom";
import { currentUserAtom, userRoleAtom } from "@/store/auth";
import { getAllClasses, getClassByCode } from "@/services/class.service";
import { getUsersByRole } from "@/services/auth.service";
import type { ClassDoc, UserDoc } from "@/types";

type SearchType = "gv" | "sv" | "hocphan" | "lop";

const SEARCH_OPTIONS: { key: SearchType; label: string }[] = [
  { key: "gv", label: "GV" },
  { key: "sv", label: "SV" },
  { key: "hocphan", label: "Học phần" },
  { key: "lop", label: "Lớp" },
];

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  avatar?: string;
  type: "class" | "student" | "teacher";
  path?: string;
}

export default function SearchPage() {
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);
  const role = useAtomValue(userRoleAtom);
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("lop");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [allClasses, setAllClasses] = useState<ClassDoc[]>([]);

  const [allTeachers, setAllTeachers] = useState<UserDoc[]>([]);

  // Load toàn bộ lớp + GV trong hệ thống — vừa để tìm kiếm trên cả database,
  // vừa hiển thị sẵn khi chưa gõ từ khóa (trang không bị trống)
  useEffect(() => {
    getAllClasses().then(setAllClasses).catch(() => {});
    getUsersByRole("teacher").then(setAllTeachers).catch(() => {});
  }, []);

  const handleSearch = useCallback(async () => {
    const q = query.trim().toLowerCase();
    if (!q || !user) return;

    setLoading(true);
    setSearched(true);

    try {
      const found: SearchResult[] = [];

      if (searchType === "lop" || searchType === "hocphan") {
        // Tìm lớp/học phần trên TOÀN BỘ database theo tên hoặc mã
        const classes = allClasses.length > 0 ? allClasses : await getAllClasses();
        for (const c of classes) {
          if (c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)) {
            found.push({
              id: c.id,
              title: c.name,
              subtitle: `Mã: ${c.code} · GV: ${c.teacherName} · ${c.studentIds.length} SV`,
              type: "class",
              // Chỉ điều hướng vào chi tiết khi là lớp của chính GV này
              path: role === "teacher" && c.teacherId === user.id ? `/teacher/class/${c.id}` : undefined,
            });
          }
        }
        // Fallback: tra mã chính xác (phòng khi cache lớp chưa kịp cập nhật)
        if (found.length === 0) {
          const byCode = await getClassByCode(q);
          if (byCode) {
            found.push({
              id: byCode.id,
              title: byCode.name,
              subtitle: `Mã: ${byCode.code} · GV: ${byCode.teacherName} · ${byCode.studentIds.length} SV`,
              type: "class",
              path: role === "teacher" && byCode.teacherId === user.id ? `/teacher/class/${byCode.id}` : undefined,
            });
          }
        }
      } else if (searchType === "sv") {
        // Tìm sinh viên trên toàn bộ database theo tên hoặc MSSV
        const students = await getUsersByRole("student");
        for (const s of students) {
          const nameMatch = s.name.toLowerCase().includes(q);
          const mssvMatch = !!s.mssv && s.mssv.toLowerCase().includes(q);
          if (nameMatch || mssvMatch) {
            const inClasses = allClasses
              .filter(c => c.studentIds.includes(s.id) || (!!s.mssv && c.rosterMssv?.includes(s.mssv)))
              .map(c => c.name);
            found.push({
              id: s.id,
              title: s.name,
              subtitle: [s.mssv ? `MSSV: ${s.mssv}` : null, inClasses.length > 0 ? inClasses.join(", ") : "Sinh viên"]
                .filter(Boolean).join(" · "),
              avatar: s.avatar,
              type: "student",
            });
          }
        }
      } else if (searchType === "gv") {
        // Tìm giảng viên trên toàn bộ database theo tên
        const teachers = await getUsersByRole("teacher");
        for (const t of teachers) {
          if (t.name.toLowerCase().includes(q)) {
            const classCount = allClasses.filter(c => c.teacherId === t.id).length;
            found.push({
              id: t.id,
              title: t.name,
              subtitle: classCount > 0 ? `Giảng viên · ${classCount} lớp` : "Giảng viên",
              avatar: t.avatar,
              type: "teacher",
            });
          }
        }
      }

      setResults(found);
    } finally {
      setLoading(false);
    }
  }, [query, searchType, allClasses, user, role]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  // Khi CHƯA tìm kiếm → hiển thị sẵn toàn bộ lớp học + giảng viên trong hệ
  // thống để trang không bị trống (sinh động ngay khi mở tab)
  const defaultRows: SearchResult[] = [
    ...allClasses.map((c) => ({
      id: c.id,
      title: c.name,
      subtitle: `Mã: ${c.code} · GV: ${c.teacherName} · ${c.studentIds.length} SV`,
      type: "class" as const,
      path: role === "teacher" && c.teacherId === user?.id ? `/teacher/class/${c.id}` : undefined,
    })),
    ...allTeachers.map((t) => {
      const classCount = allClasses.filter((c) => c.teacherId === t.id).length;
      return {
        id: t.id,
        title: t.name,
        subtitle: classCount > 0 ? `Giảng viên · ${classCount} lớp` : "Giảng viên",
        avatar: t.avatar || undefined,
        type: "teacher" as const,
      };
    }),
  ];
  const displayRows = searched ? results : defaultRows;

  return (
    <Page style={{ background: "#f2f2f7", minHeight: "100vh", padding: 0 }}>
      {/* -- Red header + BK logo overlap -- */}
      <div style={{ position: "relative", marginBottom: 30 }}>
        <div
          style={{
            background: "#be1d2c",
            paddingTop: "calc(var(--zaui-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 14px)",
            paddingBottom: 32,
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          <div className="flex items-center justify-between">
            <div style={{ width: 26 }} />
            <span style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: 1.5 }}>
              Zimo Checkin
            </span>
            <div className="relative">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* -- Search section -- */}
      <div style={{ padding: "0 16px", paddingBottom: "calc(90px + env(safe-area-inset-bottom, 0px))" }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 10 }}>
          Tìm kiếm
        </p>

        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder={
              searchType === "gv" ? "Tên giảng viên..." :
              searchType === "sv" ? "Tên sinh viên..." :
              searchType === "hocphan" ? "Tên học phần..." :
              "Tên hoặc mã lớp..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: "100%",
              padding: "12px 48px 12px 16px",
              borderRadius: 10,
              border: "1.5px solid rgba(0,0,0,0.08)",
              fontSize: 15,
              color: "#1a1a1a",
              outline: "none",
              background: "#ffffff",
              boxSizing: "border-box",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(190,29,44,0.5)";
              e.currentTarget.style.boxShadow = "0 0 8px rgba(190,29,44,0.2)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)";
              e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              position: "absolute",
              right: 4,
              top: 4,
              bottom: 4,
              width: 40,
              borderRadius: 8,
              background: "#be1d2c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
        </div>

        {/* Radio buttons */}
        <div className="flex items-center" style={{ marginTop: 16, gap: 24 }}>
          {SEARCH_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className="flex items-center"
              style={{ cursor: "pointer", gap: 6 }}
              onClick={() => { setSearchType(opt.key); setResults([]); setSearched(false); }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: `2px solid ${searchType === opt.key ? "#be1d2c" : "rgba(0,0,0,0.08)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {searchType === opt.key && (
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "#be1d2c",
                    }}
                  />
                )}
              </div>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>

        {/* Results */}
        <div style={{ marginTop: 20 }}>
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    height: 64,
                    borderRadius: 12,
                    background: "#e5e7eb",
                    animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                  }}
                />
              ))}
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" style={{ margin: "0 auto 12px", display: "block" }}>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#9ca3af" }}>Không tìm thấy kết quả</p>
              <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Thử từ khóa khác</p>
            </div>
          )}

          {!loading && !searched && displayRows.length > 0 && (
            <p style={{
              fontSize: 11, fontWeight: 600, color: "#9ca3af",
              textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
            }}>
              Có trong hệ thống · {allClasses.length} lớp · {allTeachers.length} giảng viên
            </p>
          )}

          {!loading && displayRows.map((r, index) => (
            <button
              key={r.id}
              className={`animate-stagger-${Math.min(index + 1, 10)}`}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                padding: "12px",
                marginBottom: 8,
                borderRadius: 12,
                background: "#ffffff",
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                textAlign: "left",
              }}
              onClick={() => r.path && navigate(r.path)}
            >
              {r.avatar ? (
                <Avatar src={r.avatar} size={40} style={{ flexShrink: 0 }} />
              ) : (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: r.type === "class" ? "rgba(190,29,44,0.1)" : r.type === "teacher" ? "rgba(167,139,250,0.15)" : "rgba(34,197,94,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {r.type === "class" ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /></svg>
                  ) : r.type === "teacher" ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" /></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" /></svg>
                  )}
                </div>
              )}
              <div style={{ marginLeft: 12, minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }} className="truncate">{r.title}</p>
                <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }} className="truncate">{r.subtitle}</p>
              </div>
              {r.path && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <path d="M6 3l5 5-5 5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </Page>
  );
}
