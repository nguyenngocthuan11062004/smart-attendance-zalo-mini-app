import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Card, Form, Input, Button, Typography, Alert } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const { Title, Text } = Typography;

export default function LoginPage() {
  const { user, userDoc, loading, error, login } = useAdminAuth();
  const [submitting, setSubmitting] = useState(false);

  if (user && userDoc?.role === "admin") {
    return <Navigate to="/" replace />;
  }

  const handleFinish = async (values: { email: string; password: string }) => {
    setSubmitting(true);
    await login(values.email, values.password);
    setSubmitting(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)",
      }}
    >
      <Card
        style={{ width: 400, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
        styles={{ body: { padding: 32 } }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img
            src="/icon_zimo.png"
            alt="Zimo Checkin"
            style={{ width: 80, height: 80, borderRadius: 20, margin: "0 auto 16px", display: "block" }}
          />
          <Title level={3} style={{ margin: 0 }}>
            Zimo Checkin Admin
          </Title>
          <Text type="secondary">Hệ thống quản lý điểm danh thông minh</Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Form layout="vertical" onFinish={handleFinish} autoComplete="off">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Email"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Mật khẩu"
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={submitting || loading}
              style={{ background: "#be1d2c", borderColor: "#be1d2c" }}
            >
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
