import React, { useEffect } from "react";
import { Page, Box, Button, Text, Avatar } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAtomValue } from "jotai";
import { globalLoadingAtom } from "@/store/ui";
import type { UserRole } from "@/types";
import logo from "@/static/icon_inhust.png";

export default function LoginPage() {
  const navigate = useNavigate();
  const { currentUser, login, selectRole } = useAuth();
  const loading = useAtomValue(globalLoadingAtom);

  // If user already has a role, go straight to home
  useEffect(() => {
    if (currentUser && currentUser.role) {
      navigate("/home", { replace: true });
    }
  }, [currentUser, navigate]);

  const handleLogin = async () => {
    await login(); // Redirects to Google
  };

  const handleSelectRole = async (role: UserRole) => {
    await selectRole(role);
    navigate("/home", { replace: true });
  };

  // Show role selection if user is signed in but has no role
  if (currentUser && !currentUser.role) {
    return (
      <Page className="flex items-center justify-center" style={{ minHeight: "100vh" }}>
        <Box className="flex flex-col items-center space-y-6 p-8 w-full">
          <Avatar src={currentUser.avatar} size={80} />
          <Text.Title size="large">Xin chào, {currentUser.name}!</Text.Title>
          <Text className="text-gray-500 text-center">Bạn là ai?</Text>

          <Button
            fullWidth
            variant="primary"
            size="large"
            loading={loading}
            onClick={() => handleSelectRole("student")}
          >
            Sinh viên
          </Button>

          <Button
            fullWidth
            variant="secondary"
            size="large"
            loading={loading}
            onClick={() => handleSelectRole("teacher")}
          >
            Giảng viên
          </Button>
        </Box>
      </Page>
    );
  }

  // Show login button
  return (
    <Page className="flex items-center justify-center" style={{ minHeight: "100vh" }}>
      <Box className="flex flex-col items-center space-y-6 p-8">
        <img
          src={logo}
          alt="logo"
          style={{ width: 100, height: 100, borderRadius: 20, objectFit: "contain" }}
        />
        <Text.Title size="large">Điểm danh thông minh</Text.Title>
        <Text className="text-gray-500 text-center">
          Hệ thống điểm danh chống gian lận bằng xác minh ngang hàng
        </Text>
        <Button
          fullWidth
          variant="primary"
          size="large"
          loading={loading}
          onClick={handleLogin}
        >
          Đăng nhập với Google
        </Button>
      </Box>
    </Page>
  );
}
