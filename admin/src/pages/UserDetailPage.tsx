import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card, Descriptions, Tag, Avatar, Space, Button, Typography, Table, Spin, Empty, Row, Col, Statistic, App,
} from "antd";
import { ArrowLeftOutlined, UserOutlined } from "@ant-design/icons";
import {
  getUserById,
  getUserClasses,
  getStudentAttendanceSummary,
} from "@/services/admin-user.service";
import type { UserDoc } from "@/types";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;

interface ClassRow {
  id: string;
  name: string;
  code: string;
  teacherName?: string;
  studentCount?: number;
  createdAt?: number;
}

const roleLabel: Record<string, string> = {
  student: "Sinh viên",
  teacher: "Giảng viên",
  admin: "Quản trị viên",
};
const roleColor: Record<string, string> = {
  student: "blue",
  teacher: "red",
  admin: "purple",
};

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [user, setUser] = useState<UserDoc | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [attendance, setAttendance] = useState<{ total: number; present: number; review: number; absent: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const u = await getUserById(userId);
        if (!mounted) return;
        if (!u) {
          message.error("Không tìm thấy người dùng");
          setLoading(false);
          return;
        }
        setUser(u);

        const role = u.role === "teacher" ? "teacher" : "student";
        const [cls, summary] = await Promise.all([
          getUserClasses(userId, role).catch(() => [] as ClassRow[]),
          // Chỉ fetch attendance summary cho SV
          role === "student"
            ? getStudentAttendanceSummary(userId).catch(() => ({ total: 0, present: 0, review: 0, absent: 0 }))
            : Promise.resolve(null),
        ]);
        if (!mounted) return;
        setClasses(cls);
        setAttendance(summary);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userId, message]);

  const classColumns: ColumnsType<ClassRow> = [
    { title: "Tên lớp", dataIndex: "name", key: "name", render: (v, r) => <a onClick={() => navigate(`/classes/${r.id}`)}>{v}</a> },
    { title: "Mã lớp", dataIndex: "code", key: "code", width: 130 },
    ...(user?.role === "student"
      ? [{ title: "Giảng viên", dataIndex: "teacherName", key: "teacherName", width: 180 }]
      : [{ title: "Số SV", dataIndex: "studentCount", key: "studentCount", width: 80 }]),
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 130,
      render: (t: number) => (t ? new Date(t).toLocaleDateString("vi-VN") : "—"),
      sorter: (a, b) => (a.createdAt || 0) - (b.createdAt || 0),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <Empty description="Không tìm thấy người dùng" />
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Button onClick={() => navigate("/users")}>Quay lại</Button>
        </div>
      </Card>
    );
  }

  const isStudent = user.role === "student";

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          Quay lại
        </Button>
        <Title level={4} style={{ margin: 0 }}>Chi tiết người dùng</Title>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <Space size={16} align="start">
          <Avatar size={80} src={user.avatar} icon={<UserOutlined />} />
          <div>
            <Title level={4} style={{ margin: 0 }}>{user.name}</Title>
            <Space style={{ marginTop: 4 }}>
              <Tag color={roleColor[user.role] || "default"}>{roleLabel[user.role] || user.role}</Tag>
              {user.hustVerified && <Tag color="green">HUST Verified</Tag>}
              {user.faceRegistered && <Tag color="cyan">Face đã đăng ký</Tag>}
            </Space>
          </div>
        </Space>

        <Descriptions column={{ xs: 1, sm: 2 }} style={{ marginTop: 20 }} bordered size="small">
          {isStudent && <Descriptions.Item label="Mã sinh viên">{user.mssv || "—"}</Descriptions.Item>}
          <Descriptions.Item label={isStudent ? "Email cá nhân" : "Email công vụ"}>
            {user.email || "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Số điện thoại">{user.phone || "—"}</Descriptions.Item>
          <Descriptions.Item label="Ngày sinh">{user.birthdate || "—"}</Descriptions.Item>
          <Descriptions.Item label="Khoa/Viện">{user.department || "—"}</Descriptions.Item>
          <Descriptions.Item label={isStudent ? "Hệ" : "Bộ môn"}>{user.program || "—"}</Descriptions.Item>
          {isStudent && <Descriptions.Item label="Lớp hành chính">{user.className || "—"}</Descriptions.Item>}
          <Descriptions.Item label="Ngày tạo">
            {user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="ID" span={2}>
            <Text code style={{ fontSize: 11 }}>{user.id}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Attendance summary — chỉ hiển thị cho SV */}
      {isStudent && attendance && (
        <Card title="Tổng quan điểm danh" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={12} sm={6}>
              <Statistic title="Tổng buổi" value={attendance.total} />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic title="Có mặt" value={attendance.present} valueStyle={{ color: "#22c55e" }} />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic title="Xem xét" value={attendance.review} valueStyle={{ color: "#f59e0b" }} />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Vắng"
                value={attendance.absent}
                valueStyle={{ color: attendance.absent > 0 ? "#ef4444" : "#6b7280" }}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Class list */}
      <Card
        title={
          isStudent
            ? `Các lớp đang học (${classes.length})`
            : `Các lớp đang dạy (${classes.length})`
        }
      >
        {classes.length === 0 ? (
          <Empty description={isStudent ? "Sinh viên chưa thuộc lớp nào" : "Giảng viên chưa dạy lớp nào"} />
        ) : (
          <Table
            dataSource={classes}
            columns={classColumns}
            rowKey="id"
            pagination={{ pageSize: 10, showTotal: (t) => `${t} lớp` }}
            size="middle"
          />
        )}
      </Card>
    </div>
  );
}
