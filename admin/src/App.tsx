import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConfigProvider, App as AntApp } from "antd";
import viVN from "antd/locale/vi_VN";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminGuard from "@/components/guards/AdminGuard";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import UsersPage from "@/pages/UsersPage";
import UserDetailPage from "@/pages/UserDetailPage";
import ClassesPage from "@/pages/ClassesPage";
import ClassDetailPage from "@/pages/ClassDetailPage";
import AttendancePage from "@/pages/AttendancePage";
import SessionDetailPage from "@/pages/SessionDetailPage";
import AbsenceRequestsPage from "@/pages/AbsenceRequestsPage";
import FraudReportsPage from "@/pages/FraudReportsPage";
import InviteCodesPage from "@/pages/InviteCodesPage";

const themeConfig = {
  token: {
    colorPrimary: "#be1d2c",
    borderRadius: 8,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
};

export default function App() {
  return (
    <ConfigProvider locale={viVN} theme={themeConfig}>
      <AntApp>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <AdminGuard>
                  <AdminLayout />
                </AdminGuard>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/users/:userId" element={<UserDetailPage />} />
              <Route path="/classes" element={<ClassesPage />} />
              <Route path="/classes/:classId" element={<ClassDetailPage />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/attendance/sessions/:sessionId" element={<SessionDetailPage />} />
              <Route path="/absence-requests" element={<AbsenceRequestsPage />} />
              <Route path="/fraud-reports" element={<FraudReportsPage />} />
              <Route path="/invite-codes" element={<InviteCodesPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}
