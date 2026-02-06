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
import TeacherClasses from "@/pages/teacher/TeacherClasses";
import TeacherSession from "@/pages/teacher/TeacherSession";
import TeacherMonitor from "@/pages/teacher/TeacherMonitor";
import TeacherReview from "@/pages/teacher/TeacherReview";

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
              {/* Dev mode: start at /dev for testing */}
              <Route path="/" element={<Navigate to="/dev" replace />} />
              <Route path="/dev" element={<DevPage />} />

              {/* Public routes */}
              <Route path="/splash" element={<SplashPage />} />
              <Route path="/welcome" element={<WelcomePage />} />
              <Route path="/login" element={<LoginPage />} />

              {/* All routes open - no guards for dev testing */}
              <Route path="/home" element={<HomePage />} />

              {/* Student routes */}
              <Route path="/student/classes" element={<StudentClasses />} />
              <Route path="/student/attendance/:sessionId" element={<StudentAttendance />} />
              <Route path="/student/history" element={<StudentHistory />} />

              {/* Teacher routes */}
              <Route path="/teacher/classes" element={<TeacherClasses />} />
              <Route path="/teacher/session/:classId" element={<TeacherSession />} />
              <Route path="/teacher/monitor/:sessionId" element={<TeacherMonitor />} />
              <Route path="/teacher/review/:sessionId" element={<TeacherReview />} />
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
