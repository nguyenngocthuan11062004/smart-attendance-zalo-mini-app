import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAtomValue } from "jotai";
import { BottomNavigation, Icon } from "zmp-ui";
import { userRoleAtom } from "@/store/auth";

export default function AppBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useAtomValue(userRoleAtom);

  if (!role) return null;

  const hiddenPaths = ["/splash", "/welcome", "/login"];
  if (hiddenPaths.some((p) => location.pathname.startsWith(p))) return null;

  if (role === "student") {
    return (
      <BottomNavigation
        fixed
        activeKey={location.pathname}
        onChange={(key) => navigate(key as string)}
      >
        <BottomNavigation.Item
          key="/home"
          label="Trang chủ"
          icon={<Icon icon="zi-home" />}
          activeIcon={<Icon icon="zi-home" />}
        />
        <BottomNavigation.Item
          key="/student/classes"
          label="Lớp học"
          icon={<Icon icon="zi-list-1" />}
          activeIcon={<Icon icon="zi-list-1" />}
        />
        <BottomNavigation.Item
          key="/student/history"
          label="Lịch sử"
          icon={<Icon icon="zi-clock-1" />}
          activeIcon={<Icon icon="zi-clock-1" />}
        />
      </BottomNavigation>
    );
  }

  return (
    <BottomNavigation
      fixed
      activeKey={location.pathname}
      onChange={(key) => navigate(key as string)}
    >
      <BottomNavigation.Item
        key="/home"
        label="Trang chủ"
        icon={<Icon icon="zi-home" />}
        activeIcon={<Icon icon="zi-home" />}
      />
      <BottomNavigation.Item
        key="/teacher/classes"
        label="Lớp học"
        icon={<Icon icon="zi-list-1" />}
        activeIcon={<Icon icon="zi-list-1" />}
      />
    </BottomNavigation>
  );
}
