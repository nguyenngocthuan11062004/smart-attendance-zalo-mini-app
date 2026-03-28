import { useState, useEffect } from "react";
import { Row, Col, Card, Statistic, Typography, Table, Tag, Spin } from "antd";
import {
  TeamOutlined,
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getUserStats } from "@/services/admin-user.service";
import { getClassStats } from "@/services/admin-class.service";
import { getAttendanceStats, getActiveSessions } from "@/services/admin-attendance.service";
import { getPendingCount } from "@/services/admin-absence.service";
import type { SessionDoc } from "@/types";

const { Title } = Typography;

const COLORS = ["#22c55e", "#f59e0b", "#ef4444"];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({ total: 0, students: 0, teachers: 0, admins: 0 });
  const [classStats, setClassStats] = useState({ total: 0, avgStudents: 0 });
  const [attendanceStats, setAttendanceStats] = useState({
    totalRecords: 0, presentCount: 0, reviewCount: 0, absentCount: 0,
  });
  const [activeSessions, setActiveSessions] = useState<SessionDoc[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const [users, classes, attendance, sessions, pending] = await Promise.all([
          getUserStats(),
          getClassStats(),
          getAttendanceStats(),
          getActiveSessions(),
          getPendingCount(),
        ]);
        setUserStats(users);
        setClassStats(classes);
        setAttendanceStats(attendance);
        setActiveSessions(sessions);
        setPendingRequests(pending);
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

  const barData = [
    { name: "Sinh viên", value: userStats.students },
    { name: "Giảng viên", value: userStats.teachers },
    { name: "Admin", value: userStats.admins },
  ];

  const sessionColumns = [
    { title: "Lớp", dataIndex: "className", key: "className" },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (s: string) => (
        <Tag color={s === "active" ? "green" : "default"}>
          {s === "active" ? "Đang diễn ra" : "Đã kết thúc"}
        </Tag>
      ),
    },
    {
      title: "Bắt đầu",
      dataIndex: "startedAt",
      key: "startedAt",
      render: (t: number) => new Date(t).toLocaleString("vi-VN"),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Tổng quan hệ thống</Title>

      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="Tổng người dùng"
              value={userStats.total}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic title="Sinh viên" value={userStats.students} valueStyle={{ color: "#1677ff" }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic title="Giảng viên" value={userStats.teachers} valueStyle={{ color: "#be1d2c" }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic title="Lớp học" value={classStats.total} prefix={<BookOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="Phiên đang mở"
              value={activeSessions.length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: "#22c55e" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="Đơn chờ duyệt"
              value={pendingRequests}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: pendingRequests > 0 ? "#f59e0b" : undefined }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Thống kê điểm danh">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Phân bổ người dùng">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#be1d2c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {activeSessions.length > 0 && (
        <Card title="Phiên điểm danh đang diễn ra" style={{ marginTop: 24 }}>
          <Table
            dataSource={activeSessions}
            columns={sessionColumns}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      )}
    </div>
  );
}
