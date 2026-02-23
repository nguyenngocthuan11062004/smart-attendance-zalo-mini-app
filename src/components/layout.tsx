import React from "react";
import { getSystemInfo } from "zmp-sdk";
import {
  AnimationRoutes,
  App,
  Route,
  SnackbarProvider,
  ZMPRouter,
} from "zmp-ui";
import { AppProps } from "zmp-ui/app";
import { Navigate } from "react-router-dom";
import { Provider as JotaiProvider } from "jotai";

import DevPage from "@/pages/dev";
import SplashPage from "@/pages/splash";
import WelcomePage from "@/pages/welcome";
import LoginPage from "@/pages/login";
import HomePage from "@/pages/home";
import StudentClasses from "@/pages/student/StudentClasses";
import StudentAttendance from "@/pages/student/StudentAttendance";
import StudentHistory from "@/pages/student/StudentHistory";
import FaceRegister from "@/pages/student/FaceRegister";
import TeacherClasses from "@/pages/teacher/TeacherClasses";
import TeacherSession from "@/pages/teacher/TeacherSession";
import TeacherMonitor from "@/pages/teacher/TeacherMonitor";
import TeacherReview from "@/pages/teacher/TeacherReview";
import TeacherClassDetail from "@/pages/teacher/TeacherClassDetail";
import TeacherFraudReport from "@/pages/teacher/TeacherFraudReport";
import TeacherAnalytics from "@/pages/teacher/TeacherAnalytics";
import ProfilePage from "@/pages/profile";
import SearchPage from "@/pages/search";

import AppBottomNav from "@/components/navigation/AppBottomNav";
import GlobalLoading from "@/components/ui/GlobalLoading";
import ErrorToast from "@/components/ui/ErrorToast";
import OfflineBanner from "@/components/ui/OfflineBanner";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import AuthGuard from "@/components/guards/AuthGuard";
import RoleGuard from "@/components/guards/RoleGuard";
import { useAuthInit } from "@/hooks/useAuthInit";

/** Outer shell: provides Jotai context */
const Layout = () => {
  return (
    <JotaiProvider>
      <AppShell />
    </JotaiProvider>
  );
};

/** Inner shell: runs inside JotaiProvider so hooks work */
function AppShell() {
  // Initialize auth listeners at the root – runs once, sets currentUserAtom & authInitializedAtom
  useAuthInit();

  return (
    <App theme={getSystemInfo().zaloTheme as AppProps["theme"]}>
      {/* @ts-ignore - zmp-ui SnackbarProvider type issue */}
      <SnackbarProvider>
        <ZMPRouter>
          <ErrorBoundary>
            <AnimationRoutes>
              {/* Default: redirect to splash */}
              <Route path="/" element={<Navigate to="/splash" replace />} />
              <Route path="/dev" element={<DevPage />} />

              {/* Public routes */}
              <Route path="/splash" element={<SplashPage />} />
              <Route path="/welcome" element={<WelcomePage />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Protected: requires auth */}
              <Route path="/home" element={<AuthGuard><HomePage /></AuthGuard>} />
              <Route path="/search" element={<AuthGuard><SearchPage /></AuthGuard>} />
              <Route path="/profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />

              {/* Student routes: auth + student role */}
              <Route path="/student/classes" element={<AuthGuard><RoleGuard allowedRoles={["student"]}><StudentClasses /></RoleGuard></AuthGuard>} />
              <Route path="/student/attendance/:sessionId" element={<AuthGuard><RoleGuard allowedRoles={["student"]}><StudentAttendance /></RoleGuard></AuthGuard>} />
              <Route path="/student/history" element={<AuthGuard><RoleGuard allowedRoles={["student"]}><StudentHistory /></RoleGuard></AuthGuard>} />
              <Route path="/student/face-register" element={<AuthGuard><RoleGuard allowedRoles={["student"]}><FaceRegister /></RoleGuard></AuthGuard>} />

              {/* Teacher routes: auth + teacher role */}
              <Route path="/teacher/classes" element={<AuthGuard><RoleGuard allowedRoles={["teacher"]}><TeacherClasses /></RoleGuard></AuthGuard>} />
              <Route path="/teacher/session/:classId" element={<AuthGuard><RoleGuard allowedRoles={["teacher"]}><TeacherSession /></RoleGuard></AuthGuard>} />
              <Route path="/teacher/monitor/:sessionId" element={<AuthGuard><RoleGuard allowedRoles={["teacher"]}><TeacherMonitor /></RoleGuard></AuthGuard>} />
              <Route path="/teacher/review/:sessionId" element={<AuthGuard><RoleGuard allowedRoles={["teacher"]}><TeacherReview /></RoleGuard></AuthGuard>} />
              <Route path="/teacher/class/:classId" element={<AuthGuard><RoleGuard allowedRoles={["teacher"]}><TeacherClassDetail /></RoleGuard></AuthGuard>} />
              <Route path="/teacher/fraud/:classId" element={<AuthGuard><RoleGuard allowedRoles={["teacher"]}><TeacherFraudReport /></RoleGuard></AuthGuard>} />
              <Route path="/teacher/analytics/:classId" element={<AuthGuard><RoleGuard allowedRoles={["teacher"]}><TeacherAnalytics /></RoleGuard></AuthGuard>} />
            </AnimationRoutes>
            <AppBottomNav />
            <GlobalLoading />
            <ErrorToast />
            <OfflineBanner />
          </ErrorBoundary>
        </ZMPRouter>
      </SnackbarProvider>
    </App>
  );
}

export default Layout;
