import React, { Suspense, lazy } from "react";
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

// Splash stays eager — it's the first paint and must render instantly.
import SplashPage from "@/pages/splash";

// Everything else is code-split so the initial bundle stays small on 4G.
const DevPage = lazy(() => import("@/pages/dev"));
const WelcomePage = lazy(() => import("@/pages/welcome"));
const LoginPage = lazy(() => import("@/pages/login"));
const HomePage = lazy(() => import("@/pages/home"));
const StudentClasses = lazy(() => import("@/pages/student/StudentClasses"));
const StudentAttendance = lazy(() => import("@/pages/student/StudentAttendance"));
const StudentHistory = lazy(() => import("@/pages/student/StudentHistory"));
const FaceRegister = lazy(() => import("@/pages/student/FaceRegister"));
const StudentSchedule = lazy(() => import("@/pages/student/StudentSchedule"));
const AbsenceRequest = lazy(() => import("@/pages/student/AbsenceRequest"));
const TeacherClasses = lazy(() => import("@/pages/teacher/TeacherClasses"));
const TeacherSession = lazy(() => import("@/pages/teacher/TeacherSession"));
const TeacherMonitor = lazy(() => import("@/pages/teacher/TeacherMonitor"));
const TeacherReview = lazy(() => import("@/pages/teacher/TeacherReview"));
const TeacherClassDetail = lazy(() => import("@/pages/teacher/TeacherClassDetail"));
const TeacherFraudReport = lazy(() => import("@/pages/teacher/TeacherFraudReport"));
const TeacherAnalytics = lazy(() => import("@/pages/teacher/TeacherAnalytics"));
const ProfilePage = lazy(() => import("@/pages/profile"));
const SearchPage = lazy(() => import("@/pages/search"));
const AIChatPage = lazy(() => import("@/pages/AIChatPage"));

import AppBottomNav from "@/components/navigation/AppBottomNav";
import GlobalLoading from "@/components/ui/GlobalLoading";
import ErrorToast from "@/components/ui/ErrorToast";
import OfflineBanner from "@/components/ui/OfflineBanner";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import AuthGuard from "@/components/guards/AuthGuard";
import RoleGuard from "@/components/guards/RoleGuard";
import { useAuthInit } from "@/hooks/useAuthInit";

function RouteFallback() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f2f2f7",
    }}>
      <div className="skeleton" style={{ width: 56, height: 56, borderRadius: 14 }} />
    </div>
  );
}

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
            <Suspense fallback={<RouteFallback />}>
              <AnimationRoutes>
                {/* Default: redirect to splash */}
                <Route path="/" element={<Navigate to="/splash" replace />} />
                {import.meta.env.DEV && (
                  <Route path="/dev" element={<DevPage />} />
                )}

                {/* Public routes */}
                <Route path="/splash" element={<SplashPage />} />
                <Route path="/welcome" element={<WelcomePage />} />
                <Route path="/login" element={<LoginPage />} />

                {/* Protected: requires auth */}
                <Route path="/home" element={<AuthGuard><HomePage /></AuthGuard>} />
                <Route path="/search" element={<AuthGuard><SearchPage /></AuthGuard>} />
                <Route path="/profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />
                <Route path="/ai-chat" element={<AuthGuard><AIChatPage /></AuthGuard>} />

                {/* Student routes: auth + student role */}
                <Route path="/student/classes" element={<AuthGuard><RoleGuard allowedRoles={["student"]}><StudentClasses /></RoleGuard></AuthGuard>} />
                <Route path="/student/attendance/:sessionId" element={<AuthGuard><RoleGuard allowedRoles={["student"]}><StudentAttendance /></RoleGuard></AuthGuard>} />
                <Route path="/student/history" element={<AuthGuard><RoleGuard allowedRoles={["student"]}><StudentHistory /></RoleGuard></AuthGuard>} />
                <Route path="/student/face-register" element={<AuthGuard><RoleGuard allowedRoles={["student"]}><FaceRegister /></RoleGuard></AuthGuard>} />
                <Route path="/student/schedule" element={<AuthGuard><RoleGuard allowedRoles={["student"]}><StudentSchedule /></RoleGuard></AuthGuard>} />
                <Route path="/student/absence-request" element={<AuthGuard><RoleGuard allowedRoles={["student"]}><AbsenceRequest /></RoleGuard></AuthGuard>} />

                {/* Teacher routes: auth + teacher role */}
                <Route path="/teacher/classes" element={<AuthGuard><RoleGuard allowedRoles={["teacher"]}><TeacherClasses /></RoleGuard></AuthGuard>} />
                <Route path="/teacher/session/:classId" element={<AuthGuard><RoleGuard allowedRoles={["teacher"]}><TeacherSession /></RoleGuard></AuthGuard>} />
                <Route path="/teacher/monitor/:sessionId" element={<AuthGuard><RoleGuard allowedRoles={["teacher"]}><TeacherMonitor /></RoleGuard></AuthGuard>} />
                <Route path="/teacher/review/:sessionId" element={<AuthGuard><RoleGuard allowedRoles={["teacher"]}><TeacherReview /></RoleGuard></AuthGuard>} />
                <Route path="/teacher/class/:classId" element={<AuthGuard><RoleGuard allowedRoles={["teacher"]}><TeacherClassDetail /></RoleGuard></AuthGuard>} />
                <Route path="/teacher/fraud/:classId" element={<AuthGuard><RoleGuard allowedRoles={["teacher"]}><TeacherFraudReport /></RoleGuard></AuthGuard>} />
                <Route path="/teacher/analytics/:classId" element={<AuthGuard><RoleGuard allowedRoles={["teacher"]}><TeacherAnalytics /></RoleGuard></AuthGuard>} />
              </AnimationRoutes>
            </Suspense>
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
