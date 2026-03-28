import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu, Avatar, Dropdown, theme } from "antd";
import {
  DashboardOutlined,
  TeamOutlined,
  BookOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  WarningOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: "/", icon: <DashboardOutlined />, label: "Tổng quan" },
  { key: "/users", icon: <TeamOutlined />, label: "Người dùng" },
  { key: "/classes", icon: <BookOutlined />, label: "Lớp học" },
  { key: "/attendance", icon: <CheckCircleOutlined />, label: "Điểm danh" },
  { key: "/absence-requests", icon: <FileTextOutlined />, label: "Đơn xin phép" },
  { key: "/fraud-reports", icon: <WarningOutlined />, label: "Gian lận" },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { userDoc, logout } = useAdminAuth();
  const { token } = theme.useToken();

  const selectedKey = menuItems.find((item) =>
    item.key === "/" ? location.pathname === "/" : location.pathname.startsWith(item.key)
  )?.key || "/";

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
            {collapsed ? "iH" : "inHUST Admin"}
          </span>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
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

          <Dropdown menu={userMenu} placement="bottomRight">
            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <Avatar icon={<UserOutlined />} style={{ background: "#be1d2c" }} />
              <span style={{ fontWeight: 500 }}>{userDoc?.name || "Admin"}</span>
            </div>
          </Dropdown>
        </Header>

        <Content style={{ margin: 24, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
