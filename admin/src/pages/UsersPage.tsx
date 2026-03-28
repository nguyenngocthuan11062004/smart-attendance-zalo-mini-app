import { useState, useEffect, useCallback } from "react";
import { Card, Table, Input, Select, Tag, Avatar, Space, Button, Typography, App } from "antd";
import { SearchOutlined, DownloadOutlined, UserOutlined } from "@ant-design/icons";
import { getUsers, getUserStats } from "@/services/admin-user.service";
import { exportUsersToExcel } from "@/services/import-export.service";
import type { UserDoc, UserRole } from "@/types";
import type { ColumnsType } from "antd/es/table";

const { Title } = Typography;

export default function UsersPage() {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [stats, setStats] = useState({ total: 0, students: 0, teachers: 0, admins: 0 });
  const { message } = App.useApp();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [result, userStats] = await Promise.all([
        getUsers({ role: roleFilter || undefined, search: search || undefined }),
        getUserStats(),
      ]);
      setUsers(result.users);
      setStats(userStats);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleExport = () => {
    exportUsersToExcel(users, `users_${new Date().toISOString().slice(0, 10)}.xlsx`);
    message.success("Đã xuất file Excel");
  };

  const roleColor: Record<string, string> = {
    student: "blue",
    teacher: "red",
    admin: "purple",
  };

  const roleLabel: Record<string, string> = {
    student: "Sinh viên",
    teacher: "Giảng viên",
    admin: "Admin",
  };

  const columns: ColumnsType<UserDoc> = [
    {
      title: "Người dùng",
      key: "user",
      render: (_, r) => (
        <Space>
          <Avatar src={r.avatar} icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 500 }}>{r.name}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{r.mssv || r.email || r.phone}</div>
          </div>
        </Space>
      ),
    },
    {
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      width: 120,
      render: (role: string) => <Tag color={roleColor[role]}>{roleLabel[role] || role}</Tag>,
    },
    {
      title: "Khoa",
      dataIndex: "department",
      key: "department",
      width: 200,
      render: (v: string) => v || "—",
    },
    {
      title: "SĐT",
      dataIndex: "phone",
      key: "phone",
      width: 130,
      render: (v: string) => v || "—",
    },
    {
      title: "HUST",
      key: "hust",
      width: 80,
      render: (_, r) => (
        r.hustVerified ? <Tag color="green">Verified</Tag> : <Tag>Chưa</Tag>
      ),
    },
    {
      title: "Face",
      key: "face",
      width: 80,
      render: (_, r) => (
        r.faceRegistered ? <Tag color="green">Đã ĐK</Tag> : <Tag>Chưa</Tag>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 130,
      render: (t: number) => new Date(t).toLocaleDateString("vi-VN"),
      sorter: (a, b) => a.createdAt - b.createdAt,
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Quản lý người dùng</Title>
        <Space>
          <Tag>{stats.students} SV</Tag>
          <Tag>{stats.teachers} GV</Tag>
          <Tag>{stats.admins} Admin</Tag>
        </Space>
      </div>

      <Card>
        <Space style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }} wrap>
          <Space wrap>
            <Input
              placeholder="Tìm tên, MSSV, SĐT, email..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 280 }}
              allowClear
            />
            <Select
              value={roleFilter}
              onChange={setRoleFilter}
              style={{ width: 150 }}
              options={[
                { value: "", label: "Tất cả vai trò" },
                { value: "student", label: "Sinh viên" },
                { value: "teacher", label: "Giảng viên" },
                { value: "admin", label: "Admin" },
              ]}
            />
          </Space>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            Xuất Excel
          </Button>
        </Space>

        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `${t} người dùng` }}
          scroll={{ x: 900 }}
          size="middle"
        />
      </Card>
    </div>
  );
}
