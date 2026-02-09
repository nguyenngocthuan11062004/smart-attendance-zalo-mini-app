import React, { useState } from "react";
import { Page } from "zmp-ui";
import bkLogo from "@/static/bk_logo.png";

type SearchType = "gv" | "sv" | "hocphan" | "lop";

const SEARCH_OPTIONS: { key: SearchType; label: string }[] = [
  { key: "gv", label: "GV" },
  { key: "sv", label: "SV" },
  { key: "hocphan", label: "Học phần" },
  { key: "lop", label: "Lớp" },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("gv");

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

        <input
          type="text"
          placeholder="Họ và tên"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 10,
            border: "1.5px solid #bfdbfe",
            fontSize: 15,
            color: "#1f2937",
            outline: "none",
            background: "#fff",
            boxSizing: "border-box",
          }}
        />

        {/* Radio buttons */}
        <div className="flex items-center" style={{ marginTop: 16, gap: 24 }}>
          {SEARCH_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className="flex items-center"
              style={{ cursor: "pointer", gap: 6 }}
              onClick={() => setSearchType(opt.key)}
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
      </div>
    </Page>
  );
}
