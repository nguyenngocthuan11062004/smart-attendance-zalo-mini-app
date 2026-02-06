import React from "react";
import { Page, Box, Text, Avatar, Button, Icon } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { currentUserAtom, userRoleAtom } from "@/store/auth";
import { useAuth } from "@/hooks/useAuth";

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);
  const role = useAtomValue(userRoleAtom);
  const { logout } = useAuth();

  if (!user || !role) {
    return null;
  }

  return (
    <Page className="page">
      <Box className="flex items-center space-x-3 mb-6">
        <Avatar src={user.avatar} size={48} />
        <div className="flex-1">
          <Text bold size="large">
            {user.name}
          </Text>
          <Text size="xSmall" className="text-gray-500">
            {role === "student" ? "Sinh viên" : "Giảng viên"}
          </Text>
        </div>
      </Box>

      <Text.Title size="large" className="mb-4">
        Trang chủ
      </Text.Title>

      {role === "student" ? (
        <Box className="space-y-3">
          <DashboardCard
            icon="zi-list-1"
            title="Lớp học của tôi"
            desc="Xem và tham gia lớp học"
            onClick={() => navigate("/student/classes")}
          />
          <DashboardCard
            icon="zi-clock-1"
            title="Lịch sử điểm danh"
            desc="Xem kết quả điểm danh"
            onClick={() => navigate("/student/history")}
          />
        </Box>
      ) : (
        <Box className="space-y-3">
          <DashboardCard
            icon="zi-list-1"
            title="Quản lý lớp học"
            desc="Tạo và quản lý lớp học"
            onClick={() => navigate("/teacher/classes")}
          />
        </Box>
      )}

      <Box className="mt-8">
        <Button
          fullWidth
          variant="tertiary"
          size="small"
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
        >
          Đăng xuất
        </Button>
      </Box>
    </Page>
  );
}

function DashboardCard({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: any;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <Box
      className="flex items-center p-4 bg-white rounded-xl shadow-sm active:bg-gray-50 transition-colors"
      onClick={onClick}
    >
      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mr-4">
        <Icon icon={icon} className="text-blue-500" />
      </div>
      <div className="flex-1">
        <Text bold>{title}</Text>
        <Text size="xSmall" className="text-gray-500">
          {desc}
        </Text>
      </div>
      <Icon icon="zi-chevron-right" className="text-gray-400" />
    </Box>
  );
}
