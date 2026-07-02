import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu, Avatar, Dropdown, Button, Tooltip, Badge, theme } from "antd";
import {
  DashboardOutlined,
  TeamOutlined,
  UserAddOutlined,
  BookOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  WarningOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DesktopOutlined,
  BellOutlined,
} from "@ant-design/icons";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { getPendingTeachers } from "@/services/admin-user.service";
import { getPendingCount } from "@/services/admin-absence.service";

const { Header, Sider, Content } = Layout;

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { userDoc, logout } = useAdminAuth();
  const { token } = theme.useToken();

  // Đếm số việc cần xử lý → hiển thị thông báo (chuông + badge menu)
  const [teacherPending, setTeacherPending] = useState(0);
  const [absencePending, setAbsencePending] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const [teachers, absence] = await Promise.all([
          getPendingTeachers().then((r) => r.length).catch(() => 0),
          getPendingCount().catch(() => 0),
        ]);
        if (!cancelled) {
          setTeacherPending(teachers);
          setAbsencePending(absence);
        }
      } catch { /* ignore */ }
    };
    refresh();
    // Cập nhật mỗi 60s + mỗi khi đổi trang (admin vừa duyệt xong → số giảm)
    const id = window.setInterval(refresh, 60000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [location.pathname]);

  const totalNotif = teacherPending + absencePending;

  const menuItems = [
    { key: "/", icon: <DashboardOutlined />, label: "Tổng quan" },
    { key: "/users", icon: <TeamOutlined />, label: "Người dùng" },
    {
      key: "/teacher-requests",
      icon: <UserAddOutlined />,
      label: (
        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Duyệt giảng viên
          {teacherPending > 0 && <Badge count={teacherPending} size="small" />}
        </span>
      ),
    },
    { key: "/classes", icon: <BookOutlined />, label: "Lớp học" },
    { key: "/attendance", icon: <CheckCircleOutlined />, label: "Điểm danh" },
    {
      key: "/absence-requests",
      icon: <FileTextOutlined />,
      label: (
        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Đơn xin phép
          {absencePending > 0 && <Badge count={absencePending} size="small" />}
        </span>
      ),
    },
    { key: "/fraud-reports", icon: <WarningOutlined />, label: "Gian lận" },
  ];

  const selectedKey = menuItems.find((item) =>
    item.key === "/" ? location.pathname === "/" : location.pathname.startsWith(item.key)
  )?.key || "/";

  const openPresent = () => window.open("/present", "_blank", "noopener,noreferrer");

  const handleMenuClick = (key: string) => {
    if (key === "/present") {
      openPresent();
      return;
    }
    navigate(key);
  };

  const userMenu = {
    items: [
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "Đăng xuất",
        onClick: logout,
      },
    ],
  };

  // Trung tâm thông báo — gom các việc cần admin xử lý
  const notifMenu = {
    items:
      totalNotif === 0
        ? [{ key: "empty", label: "Không có thông báo mới", disabled: true }]
        : [
            ...(teacherPending > 0
              ? [{
                  key: "teacher",
                  icon: <UserAddOutlined style={{ color: "#be1d2c" }} />,
                  label: `${teacherPending} yêu cầu giảng viên chờ duyệt`,
                  onClick: () => navigate("/teacher-requests"),
                }]
              : []),
            ...(absencePending > 0
              ? [{
                  key: "absence",
                  icon: <FileTextOutlined style={{ color: "#f59e0b" }} />,
                  label: `${absencePending} đơn xin phép chờ duyệt`,
                  onClick: () => navigate("/absence-requests"),
                }]
              : []),
          ],
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        style={{
          background: token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <span
            style={{
              fontSize: collapsed ? 16 : 20,
              fontWeight: 700,
              color: "#be1d2c",
              transition: "all 0.2s",
            }}
          >
            {collapsed ? "ZC" : "Zimo Checkin Admin"}
          </span>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => handleMenuClick(key)}
          style={{ border: "none", marginTop: 8 }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: token.colorBgContainer,
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <div
            onClick={() => setCollapsed(!collapsed)}
            style={{ cursor: "pointer", fontSize: 18 }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Tooltip title="Mở trong tab mới — dùng trên máy tính lớp học để chiếu QR điểm danh">
              <Button
                type="primary"
                icon={<DesktopOutlined />}
                onClick={openPresent}
                style={{
                  background: "#be1d2c",
                  borderColor: "#be1d2c",
                  fontWeight: 600,
                  boxShadow: "0 2px 8px rgba(190,29,44,0.25)",
                }}
              >
                Mở cổng máy chiếu
              </Button>
            </Tooltip>

            <Dropdown menu={notifMenu} placement="bottomRight" trigger={["click"]}>
              <Badge count={totalNotif} size="small" offset={[-2, 4]}>
                <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} style={{ display: "flex", alignItems: "center", justifyContent: "center" }} />
              </Badge>
            </Dropdown>

            <Dropdown menu={userMenu} placement="bottomRight">
              <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <Avatar icon={<UserOutlined />} style={{ background: "#be1d2c" }} />
                <span style={{ fontWeight: 500 }}>{userDoc?.name || "Admin"}</span>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ margin: 24, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
