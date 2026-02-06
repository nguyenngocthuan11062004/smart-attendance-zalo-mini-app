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

import SplashPage from "@/pages/splash";
import WelcomePage from "@/pages/welcome";
import LoginPage from "@/pages/login";
import HomePage from "@/pages/home";
import StudentClasses from "@/pages/student/StudentClasses";
import StudentAttendance from "@/pages/student/StudentAttendance";
import StudentHistory from "@/pages/student/StudentHistory";
import TeacherClasses from "@/pages/teacher/TeacherClasses";
import TeacherSession from "@/pages/teacher/TeacherSession";
import TeacherMonitor from "@/pages/teacher/TeacherMonitor";
import TeacherReview from "@/pages/teacher/TeacherReview";

import AuthGuard from "@/components/guards/AuthGuard";
import RoleGuard from "@/components/guards/RoleGuard";
import AppBottomNav from "@/components/navigation/AppBottomNav";
import GlobalLoading from "@/components/ui/GlobalLoading";
import ErrorToast from "@/components/ui/ErrorToast";

const Layout = () => {
  return (
    <JotaiProvider>
      <App theme={getSystemInfo().zaloTheme as AppProps["theme"]}>
        {/* @ts-ignore - zmp-ui SnackbarProvider type issue */}
        <SnackbarProvider>
          <ZMPRouter>
            <AnimationRoutes>
              {/* Public routes */}
              <Route path="/" element={<Navigate to="/splash" replace />} />
              <Route path="/splash" element={<SplashPage />} />
              <Route path="/welcome" element={<WelcomePage />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Protected routes */}
              <Route
                path="/home"
                element={
                  <AuthGuard>
                    <HomePage />
                  </AuthGuard>
                }
              />

              {/* Student routes */}
              <Route
                path="/student/classes"
                element={
                  <AuthGuard>
                    <RoleGuard allowedRoles={["student"]}>
                      <StudentClasses />
                    </RoleGuard>
                  </AuthGuard>
                }
              />
              <Route
                path="/student/attendance/:sessionId"
                element={
                  <AuthGuard>
                    <RoleGuard allowedRoles={["student"]}>
                      <StudentAttendance />
                    </RoleGuard>
                  </AuthGuard>
                }
              />
              <Route
                path="/student/history"
                element={
                  <AuthGuard>
                    <RoleGuard allowedRoles={["student"]}>
                      <StudentHistory />
                    </RoleGuard>
                  </AuthGuard>
                }
              />

              {/* Teacher routes */}
              <Route
                path="/teacher/classes"
                element={
                  <AuthGuard>
                    <RoleGuard allowedRoles={["teacher"]}>
                      <TeacherClasses />
                    </RoleGuard>
                  </AuthGuard>
                }
              />
              <Route
                path="/teacher/session/:classId"
                element={
                  <AuthGuard>
                    <RoleGuard allowedRoles={["teacher"]}>
                      <TeacherSession />
                    </RoleGuard>
                  </AuthGuard>
                }
              />
              <Route
                path="/teacher/monitor/:sessionId"
                element={
                  <AuthGuard>
                    <RoleGuard allowedRoles={["teacher"]}>
                      <TeacherMonitor />
                    </RoleGuard>
                  </AuthGuard>
                }
              />
              <Route
                path="/teacher/review/:sessionId"
                element={
                  <AuthGuard>
                    <RoleGuard allowedRoles={["teacher"]}>
                      <TeacherReview />
                    </RoleGuard>
                  </AuthGuard>
                }
              />
            </AnimationRoutes>
            <AppBottomNav />
            <GlobalLoading />
            <ErrorToast />
          </ZMPRouter>
        </SnackbarProvider>
      </App>
    </JotaiProvider>
  );
};

export default Layout;
