import React, { useState, useMemo } from "react";
import { Page } from "zmp-ui";
import { useNavigate } from "react-router-dom";

/* ── Mock schedule data (keyed by day-of-week: 0=Sun..6=Sat) ── */
const MOCK_SCHEDULE: Record<string, ScheduleItem[]> = {
  "1": [{ code: "162317", name: "IoT và ứng dụng", courseId: "IT4735", time: "09:20", end: "11:45", room: "D9-106", period: "tiết 4-6", day: "Sáng thứ 2", week: 17 }],
  "2": [{ code: "162317", name: "IoT và ứng dụng", courseId: "IT4735", time: "07:00", end: "09:25", room: "D9-201", period: "tiết 1-3", day: "Sáng thứ 3", week: 17 }],
  "3": [{ code: "140234", name: "Lập trình Web", courseId: "IT3080", time: "13:30", end: "15:55", room: "D3-302", period: "tiết 7-9", day: "Chiều thứ 4", week: 17 }],
  "4": [{ code: "162317", name: "IoT và ứng dụng", courseId: "IT4735", time: "09:20", end: "11:45", room: "D9-106", period: "tiết 4-6", day: "Sáng thứ 5", week: 17 }],
  "5": [
    { code: "140234", name: "Lập trình Web", courseId: "IT3080", time: "07:00", end: "09:25", room: "D3-302", period: "tiết 1-3", day: "Sáng thứ 6", week: 17 },
    { code: "150456", name: "Cơ sở dữ liệu", courseId: "IT3090", time: "13:30", end: "15:55", room: "D5-201", period: "tiết 7-9", day: "Chiều thứ 6", week: 17 },
  ],
};

interface ScheduleItem {
  code: string;
  name: string;
  courseId: string;
  time: string;
  end: string;
  room: string;
  period: string;
  day: string;
  week: number;
}

const WEEK_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TABS = ["Thời khoá biểu", "Danh sách lớp", "Lịch thi"] as const;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getMonthData(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

export default function StudentSchedule() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const today = new Date();
  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const weeks = useMemo(() => getMonthData(viewYear, viewMonth), [viewYear, viewMonth]);

  // Days that have classes (weekdays with schedule entries)
  const classDays = useMemo(() => {
    const days = new Set<number>();
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(viewYear, viewMonth, d).getDay();
      if (MOCK_SCHEDULE[String(dow)]) days.add(d);
    }
    return days;
  }, [viewYear, viewMonth, daysInMonth]);

  const isCurrentMonth = monthOffset === 0;
  const todayDate = today.getDate();

  // Schedule for selected day
  const selectedDate = new Date(viewYear, viewMonth, selectedDay);
  const daySchedule = MOCK_SCHEDULE[String(selectedDate.getDay())] || [];

  return (
    <Page style={{ background: "#f8f9fa", minHeight: "100vh", padding: 0 }}>
      {/* ── Header ── */}
      <div style={{
        background: "#be1d2c", borderRadius: "0 0 24px 24px",
        padding: "calc(var(--zaui-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 14px) 16px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button onClick={() => navigate(-1)} style={{
          width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.13)",
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Thời khóa biểu</span>
        <button style={{
          width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.13)",
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <line x1="21" x2="14" y1="4" y2="4" /><line x1="10" x2="3" y1="4" y2="4" />
            <line x1="21" x2="12" y1="12" y2="12" /><line x1="8" x2="3" y1="12" y2="12" />
            <line x1="21" x2="16" y1="20" y2="20" /><line x1="12" x2="3" y1="20" y2="20" />
            <line x1="14" x2="14" y1="2" y2="6" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="16" x2="16" y1="18" y2="22" />
          </svg>
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{ background: "#ffffff", display: "flex", padding: "0 20px" }}>
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            style={{
              flex: 1, padding: "14px 0", background: "transparent", border: "none",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            }}
          >
            <span style={{
              fontSize: 14, fontWeight: i === activeTab ? 700 : 600,
              color: i === activeTab ? "#be1d2c" : "#9ca3af",
            }}>{tab}</span>
            {i === activeTab && (
              <div style={{ width: 6, height: 6, borderRadius: 3, background: "#be1d2c" }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Calendar Card ── */}
      <div style={{
        background: "#ffffff", padding: "16px 32px",
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        {/* Month navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
          <button onClick={() => { setMonthOffset((v) => v - 1); setSelectedDay(1); }} style={{ background: "transparent", border: "none", padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button onClick={() => { setMonthOffset((v) => v + 1); setSelectedDay(1); }} style={{ background: "transparent", border: "none", padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>

        {/* Week headers */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {WEEK_HEADERS.map((h) => (
            <span key={h} style={{ width: 40, textAlign: "center", fontSize: 12, fontWeight: 600, color: "#9ca3af" }}>{h}</span>
          ))}
        </div>

        {/* Date grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "flex", justifyContent: "space-between" }}>
              {week.map((day, di) => {
                if (day === null) return <div key={di} style={{ width: 40, height: 52 }} />;
                const isToday = isCurrentMonth && day === todayDate;
                const isActive = day === selectedDay;
                const hasClass = classDays.has(day);
                return (
                  <button
                    key={di}
                    onClick={() => setSelectedDay(day)}
                    style={{
                      width: 40, display: "flex", flexDirection: "column",
                      alignItems: "center", background: "transparent", border: "none", padding: 0,
                    }}
                  >
                    <div style={{
                      width: 42, height: 42, borderRadius: "50%",
                      background: isActive ? "#be1d2c" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{
                        fontSize: 14, fontWeight: isActive || isToday ? 700 : 600,
                        color: isActive ? "#ffffff" : "#1a1a1a",
                      }}>
                        {String(day).padStart(2, "0")}
                      </span>
                    </div>
                    {hasClass ? (
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%", marginTop: 2,
                        background: isActive ? "#60bfff" : "#3b82f6",
                      }} />
                    ) : (
                      <div style={{ width: 6, height: 6, marginTop: 2 }} />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Schedule for selected day ── */}
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
          Ngày {String(selectedDay).padStart(2, "0")} tháng {String(viewMonth + 1).padStart(2, "0")}
        </span>

        {daySchedule.length === 0 ? (
          <div style={{
            background: "#ffffff", borderRadius: 20, padding: "32px 16px",
            textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" style={{ margin: "0 auto 8px" }}>
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <p style={{ fontSize: 13, color: "#9ca3af" }}>Không có lịch học</p>
          </div>
        ) : (
          daySchedule.map((item, i) => (
            <div key={i} style={{
              background: "#fef2f2", borderRadius: 20, padding: 16,
              display: "flex", alignItems: "center", gap: 16,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}>
              {/* Time column */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#be1d2c" }}>{item.time}</span>
                <div style={{ width: 2, height: 16, borderRadius: 1, background: "#be1d2c40" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}>{item.end}</span>
              </div>

              {/* Info column */}
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="truncate" style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
                  {item.code} - {item.name} - {item.courseId}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: "#be1d2c", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#6b7280" }}>
                    {item.day}, {item.period}, {item.room}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: "#3b82f6", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#3b82f6" }}>Tuần {item.week}</span>
                </div>
              </div>

              {/* Chevron */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          ))
        )}
      </div>
    </Page>
  );
}
