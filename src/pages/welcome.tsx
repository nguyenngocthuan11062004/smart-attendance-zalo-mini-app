import React from "react";
import { Page, Box, Button, Text } from "zmp-ui";
import { useNavigate } from "zmp-ui";

export default function WelcomePage() {
  const navigate = useNavigate();

  const onStart = () => {
    localStorage.setItem("hasSeenWelcome", "1");
    navigate("/login", { replace: true });
  };

  return (
    <Page className="page page-no-header">
      <Box className="space-y-4">
        <Text.Title size="xLarge">Xin chào!</Text.Title>
        <Text>
          Hệ thống điểm danh thông minh chống gian lận. Xác minh ngang hàng
          giữa sinh viên bằng QR code để đảm bảo tính chính xác.
        </Text>
        <Text size="small" className="text-gray-500">
          Trust Score: 3+ peers = Có mặt | 1-2 peers = Cần xem xét | 0 = Vắng
        </Text>
        <Button fullWidth variant="primary" onClick={onStart}>
          Bắt đầu
        </Button>
      </Box>
    </Page>
  );
}
