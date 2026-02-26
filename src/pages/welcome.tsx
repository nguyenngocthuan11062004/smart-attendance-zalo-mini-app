import React from "react";
import { Page, Box, Button, Text } from "zmp-ui";
import { useNavigate } from "react-router-dom";

export default function WelcomePage() {
  const navigate = useNavigate();

  const onStart = () => {
    localStorage.setItem("hasSeenWelcome", "1");
    navigate("/login", { replace: true });
  };

  return (
    <Page className="page page-no-header" style={{ background: "#f2f2f7" }}>
      <Box className="space-y-4">
        <Text.Title size="xLarge" style={{ color: "#1a1a1a" }}>Xin chào!</Text.Title>
        <Text style={{ color: "#6b7280" }}>
          Hệ thống điểm danh thông minh chống gian lận. Xác minh ngang hàng
          giữa sinh viên bằng QR code để đảm bảo tính chính xác.
        </Text>
        <Text size="small" style={{ color: "#9ca3af" }}>
          Trust Score: 3+ peers = Có mặt | 1-2 peers = Cần xem xét | 0 = Vắng
        </Text>
        <button
          className="btn-primary-dark glow"
          onClick={onStart}
        >
          Bắt đầu
        </button>
      </Box>
    </Page>
  );
}
