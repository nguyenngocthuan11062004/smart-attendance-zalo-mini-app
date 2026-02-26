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
  { key: "hocphan", label: "H\u1ecdc ph\u1ea7n" },
  { key: "lop", label: "L\u1edbp" },
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
              subtitle: `M\u00e3: ${c.code} \u00b7 ${c.studentIds.length} sinh vi\u00ean`,
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
              subtitle: `M\u00e3: ${byCode.code} \u00b7 ${byCode.studentIds.length} sinh vi\u00ean`,
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
                subtitle: inClasses.length > 0 ? inClasses.join(", ") : "Sinh vi\u00ean",
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
              subtitle: `Gi\u1ea3ng vi\u00ean \u00b7 ${info.classes.length} l\u1edbp`,
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
    <Page style={{ background: "#f2f2f7", minHeight: "100vh", padding: 0 }}>
      {/* -- Red header + BK logo overlap -- */}
      <div style={{ position: "relative", marginBottom: 30 }}>
        <div
          style={{
            background: "#be1d2c",
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
          alt="B\u00e1ch Khoa"
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

      {/* -- Search section -- */}
      <div style={{ padding: "0 16px 100px" }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 10 }}>
          T\u00ecm ki\u1ebfm
        </p>

        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder={
              searchType === "gv" ? "T\u00ean gi\u1ea3ng vi\u00ean..." :
              searchType === "sv" ? "T\u00ean sinh vi\u00ean..." :
              searchType === "hocphan" ? "T\u00ean h\u1ecdc ph\u1ea7n..." :
              "T\u00ean ho\u1eb7c m\u00e3 l\u1edbp..."
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
              <p style={{ fontSize: 14, fontWeight: 600, color: "#9ca3af" }}>Kh\u00f4ng t\u00ecm th\u1ea5y k\u1ebft qu\u1ea3</p>
              <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Th\u1eed t\u1eeb kh\u00f3a kh\u00e1c</p>
            </div>
          )}

          {!loading && results.map((r, index) => (
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
