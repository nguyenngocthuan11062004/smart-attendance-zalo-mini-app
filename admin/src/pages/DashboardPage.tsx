import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Typography, Table, Tag, Spin, Alert, Button, Empty } from "antd";
import {
  TeamOutlined,
  IdcardOutlined,
  SolutionOutlined,
  BookOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  UserAddOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getUserStats, getPendingTeachers } from "@/services/admin-user.service";
import { getClassStats } from "@/services/admin-class.service";
import { getAttendanceStats, getActiveSessions } from "@/services/admin-attendance.service";
import { getPendingCount } from "@/services/admin-absence.service";
import type { SessionDoc } from "@/types";

const { Title, Text } = Typography;

const BRAND = "#be1d2c";
const PIE_COLORS = ["#22c55e", "#f59e0b", "#ef4444"];

/* ── KPI card ─────────────────────────────────────────────────────── */
function KpiCard({
  icon, label, value, color, onClick,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`kpi-card${onClick ? " clickable" : ""}`}
      onClick={onClick}
      style={{
        background: "#fff",
        border: "1px solid #eef0f3",
        borderRadius: 14,
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        boxShadow: "0 1px 3px rgba(16,24,40,0.04)",
      }}
    >
      <div
        style={{
          width: 46, height: 46, borderRadius: 12, flexShrink: 0,
          background: `${color}14`, color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "#667085", fontWeight: 500, whiteSpace: "nowrap" }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#101828", lineHeight: 1.15, fontVariantNumeric: "tabular-nums" }}>
          {value}
        </div>
      </div>
      {onClick && (
        <RightOutlined style={{ marginLeft: "auto", color: "#cbd2da", fontSize: 12 }} />
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({ total: 0, students: 0, teachers: 0, admins: 0 });
  const [classStats, setClassStats] = useState({ total: 0, avgStudents: 0 });
  const [attendanceStats, setAttendanceStats] = useState({
    totalRecords: 0, presentCount: 0, reviewCount: 0, absentCount: 0,
  });
  const [activeSessions, setActiveSessions] = useState<SessionDoc[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [teacherPending, setTeacherPending] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [users, classes, attendance, sessions, pending, teachers] = await Promise.all([
          getUserStats(),
          getClassStats(),
          getAttendanceStats(),
          getActiveSessions(),
          getPendingCount(),
          getPendingTeachers().then((r) => r.length).catch(() => 0),
        ]);
        setUserStats(users);
        setClassStats(classes);
        setAttendanceStats(attendance);
        setActiveSessions(sessions);
        setPendingRequests(pending);
        setTeacherPending(teachers);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 120 }}>
        <Spin size="large" />
      </div>
    );
  }

  const pieData = [
    { name: "Có mặt", value: attendanceStats.presentCount },
    { name: "Cần xem xét", value: attendanceStats.reviewCount },
    { name: "Vắng", value: attendanceStats.absentCount },
  ];
  const attendanceTotal = attendanceStats.presentCount + attendanceStats.reviewCount + attendanceStats.absentCount;
  const presentRate = attendanceTotal > 0 ? Math.round((attendanceStats.presentCount / attendanceTotal) * 100) : 0;

  const barData = [
    { name: "Sinh viên", value: userStats.students },
    { name: "Giảng viên", value: userStats.teachers },
    { name: "Admin", value: userStats.admins },
  ];

  const sessionColumns = [
    { title: "Lớp", dataIndex: "className", key: "className", render: (v: string) => <Text strong>{v}</Text> },
    {
      title: "Trạng thái", dataIndex: "status", key: "status", width: 150,
      render: (s: string) => (
        <Tag color={s === "active" ? "green" : "default"}>
          {s === "active" ? "Đang diễn ra" : "Đã kết thúc"}
        </Tag>
      ),
    },
    {
      title: "Bắt đầu", dataIndex: "startedAt", key: "startedAt", width: 200,
      render: (t: number) => new Date(t).toLocaleString("vi-VN"),
    },
  ];

  const kpis = [
    { icon: <TeamOutlined />, label: "Tổng người dùng", value: userStats.total, color: "#0f172a" },
    { icon: <IdcardOutlined />, label: "Sinh viên", value: userStats.students, color: "#2563eb" },
    { icon: <SolutionOutlined />, label: "Giảng viên", value: userStats.teachers, color: "#7c3aed" },
    { icon: <BookOutlined />, label: "Lớp học", value: classStats.total, color: "#0891b2" },
    { icon: <ClockCircleOutlined />, label: "Phiên đang mở", value: activeSessions.length, color: "#16a34a" },
    { icon: <UserAddOutlined />, label: "Yêu cầu GV", value: teacherPending, color: BRAND, onClick: () => navigate("/teacher-requests") },
    { icon: <FileTextOutlined />, label: "Đơn chờ duyệt", value: pendingRequests, color: "#f59e0b", onClick: () => navigate("/absence-requests") },
  ];

  return (
    <div style={{ fontFamily: "'Fira Sans', -apple-system, system-ui, sans-serif" }}>
      <style>{`
        .kpi-card { transition: box-shadow .2s ease, transform .2s ease, border-color .2s ease; }
        .kpi-card.clickable { cursor: pointer; }
        .kpi-card.clickable:hover {
          box-shadow: 0 10px 24px rgba(16,24,40,.10);
          transform: translateY(-2px);
          border-color: #e3e6ea;
        }
        .dash-card .ant-card-head { border-bottom: 1px solid #f0f1f3; min-height: 52px; }
        .dash-card .ant-card-head-title { font-weight: 700; color: #101828; }
        .dash-table .ant-table-tbody > tr:hover > td { background: rgba(190,29,44,0.04) !important; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, color: "#101828" }}>Tổng quan hệ thống</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>Theo dõi người dùng, lớp học và hoạt động điểm danh</Text>
      </div>

      {/* Thông báo việc cần xử lý */}
      {(teacherPending > 0 || pendingRequests > 0) && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 20, borderRadius: 12 }}
          message="Có việc cần xử lý"
          description={
            <span>
              {teacherPending > 0 && <>Có <strong>{teacherPending}</strong> yêu cầu cấp quyền giảng viên đang chờ duyệt. </>}
              {pendingRequests > 0 && <>Có <strong>{pendingRequests}</strong> đơn xin phép đang chờ duyệt.</>}
            </span>
          }
          action={
            <Button.Group>
              {teacherPending > 0 && (
                <Button size="small" type="primary" onClick={() => navigate("/teacher-requests")}>Duyệt giảng viên</Button>
              )}
              {pendingRequests > 0 && (
                <Button size="small" onClick={() => navigate("/absence-requests")}>Xem đơn</Button>
              )}
            </Button.Group>
          }
        />
      )}

      {/* KPI grid */}
      <Row gutter={[16, 16]}>
        {kpis.map((k) => (
          <Col key={k.label} xs={12} sm={12} md={8} xl={6}>
            <KpiCard {...k} />
          </Col>
        ))}
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card className="dash-card" title="Thống kê điểm danh" style={{ borderRadius: 14 }}>
            {attendanceTotal === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu điểm danh" style={{ padding: "48px 0" }} />
            ) : (
              <div style={{ position: "relative" }}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={66} outerRadius={92}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, n: string) => [`${v} bản ghi`, n]} />
                    <Legend verticalAlign="bottom" iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div style={{
                  position: "absolute", top: "42%", left: 0, right: 0,
                  transform: "translateY(-50%)", textAlign: "center", pointerEvents: "none",
                }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#16a34a", lineHeight: 1 }}>{presentRate}%</div>
                  <div style={{ fontSize: 12, color: "#667085", marginTop: 2 }}>có mặt</div>
                </div>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card className="dash-card" title="Phân bổ người dùng" style={{ borderRadius: 14 }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} barCategoryGap="34%">
                <defs>
                  <linearGradient id="barRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dc2626" />
                    <stop offset="100%" stopColor={BRAND} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
                <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: "#eef0f3" }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "rgba(190,29,44,0.05)" }} formatter={(v: number) => [`${v} người`, "Số lượng"]} />
                <Bar dataKey="value" fill="url(#barRed)" radius={[6, 6, 0, 0]} maxBarSize={64} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Active sessions */}
      <Card className="dash-card" title={`Phiên điểm danh đang diễn ra (${activeSessions.length})`} style={{ marginTop: 16, borderRadius: 14 }}>
        {activeSessions.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Hiện không có phiên nào đang diễn ra" style={{ padding: "32px 0" }} />
        ) : (
          <Table
            className="dash-table"
            dataSource={activeSessions}
            columns={sessionColumns}
            rowKey="id"
            pagination={false}
            size="middle"
          />
        )}
      </Card>
    </div>
  );
}
