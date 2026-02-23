import React, { useState, useEffect, useCallback } from "react";
import { Page, Avatar } from "zmp-ui";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router-dom";
import { currentUserAtom, userRoleAtom } from "@/store/auth";
import { getStudentClasses, getTeacherClasses, getClassStudents, getClassByCode } from "@/services/class.service";
import bkLogo from "@/static/bk_logo.png";
import type { ClassDoc } from "@/types";

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

  // Load all accessible classes on mount
  useEffect(() => {
    if (!user?.id || !role) return;
    const loadClasses = async () => {
      const classes = role === "teacher"
        ? await getTeacherClasses(user.id)
        : await getStudentClasses(user.id);
      setAllClasses(classes);
    };
    loadClasses();
  }, [user?.id, role]);

  const handleSearch = useCallback(async () => {
    const q = query.trim().toLowerCase();
    if (!q || !user) return;

    setLoading(true);
    setSearched(true);

    try {
      const found: SearchResult[] = [];

      if (searchType === "lop" || searchType === "hocphan") {
        // Search classes by name or code
        for (const c of allClasses) {
          if (c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)) {
            found.push({
              id: c.id,
              title: c.name,
              subtitle: `Mã: ${c.code} · ${c.studentIds.length} sinh viên`,
              type: "class",
              path: role === "teacher" ? `/teacher/class/${c.id}` : undefined,
            });
          }
        }
        // Also try exact code search
        if (found.length === 0) {
          const byCode = await getClassByCode(q);
          if (byCode) {
            found.push({
              id: byCode.id,
              title: byCode.name,
              subtitle: `Mã: ${byCode.code} · ${byCode.studentIds.length} sinh viên`,
              type: "class",
              path: role === "teacher" ? `/teacher/class/${byCode.id}` : undefined,
            });
          }
        }
      } else if (searchType === "sv") {
        // Search students across enrolled classes
        const allStudentIds = new Set<string>();
        for (const c of allClasses) {
          for (const sid of c.studentIds) allStudentIds.add(sid);
        }
        if (allStudentIds.size > 0) {
          const students = await getClassStudents([...allStudentIds]);
          for (const s of students) {
            if (s.name.toLowerCase().includes(q)) {
              const inClasses = allClasses.filter(c => c.studentIds.includes(s.id)).map(c => c.name);
              found.push({
                id: s.id,
                title: s.name,
                subtitle: inClasses.length > 0 ? inClasses.join(", ") : "Sinh viên",
                avatar: s.avatar,
                type: "student",
              });
            }
          }
        }
      } else if (searchType === "gv") {
        // Search teachers from class data
        const teacherMap = new Map<string, { name: string; classes: string[] }>();
        for (const c of allClasses) {
          if (!teacherMap.has(c.teacherId)) {
            teacherMap.set(c.teacherId, { name: c.teacherName, classes: [] });
          }
          teacherMap.get(c.teacherId)!.classes.push(c.name);
        }
        for (const [tid, info] of teacherMap) {
          if (info.name.toLowerCase().includes(q)) {
            found.push({
              id: tid,
              title: info.name,
              subtitle: `Giảng viên · ${info.classes.length} lớp`,
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

  return (
    <Page style={{ background: "#fff", minHeight: "100vh", padding: 0 }}>
      {/* ── Red header + BK logo overlap ── */}
      <div style={{ position: "relative", marginBottom: 30 }}>
        <div
          style={{
            background: "linear-gradient(180deg, #b91c1c 0%, #991b1b 100%)",
            paddingTop: "calc(var(--zaui-safe-area-inset-top, 0px) + 10px)",
            paddingBottom: 32,
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          <div className="flex items-center justify-between">
            <div style={{ width: 26 }} />
            <span style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: 1.5 }}>
              inHUST
            </span>
            <div className="relative">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
          </div>
        </div>
        <img
          src={bkLogo}
          alt="Bách Khoa"
          style={{
            position: "absolute",
            left: 16,
            bottom: -24,
            width: 56,
            height: 56,
            objectFit: "contain",
          }}
        />
      </div>

      {/* ── Search section ── */}
      <div style={{ padding: "0 16px 100px" }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: "#1f2937", marginBottom: 10 }}>
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
              border: "1.5px solid #bfdbfe",
              fontSize: 15,
              color: "#1f2937",
              outline: "none",
              background: "#fff",
              boxSizing: "border-box",
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
              background: "#dc2626",
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
                  border: `2px solid ${searchType === opt.key ? "#dc2626" : "#374151"}`,
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
                      background: "#dc2626",
                    }}
                  />
                )}
              </div>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#1f2937" }}>
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
                <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12 }} />
              ))}
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" style={{ margin: "0 auto 12px" }}>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#6b7280" }}>Không tìm thấy kết quả</p>
              <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Thử từ khóa khác</p>
            </div>
          )}

          {!loading && results.map((r) => (
            <button
              key={r.id}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                padding: "12px",
                marginBottom: 8,
                borderRadius: 12,
                background: "#f9fafb",
                border: "none",
                textAlign: "left",
              }}
              className="active:bg-gray-100"
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
                    background: r.type === "class" ? "#fef2f2" : r.type === "teacher" ? "#eff6ff" : "#f0fdf4",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {r.type === "class" ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /></svg>
                  ) : r.type === "teacher" ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" /></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" /></svg>
                  )}
                </div>
              )}
              <div style={{ marginLeft: 12, minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#1f2937" }} className="truncate">{r.title}</p>
                <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }} className="truncate">{r.subtitle}</p>
              </div>
              {r.path && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
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
