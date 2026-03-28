import { Navigate } from "react-router-dom";
import { Spin } from "antd";
import { useAdminAuth } from "@/hooks/useAdminAuth";

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, userDoc, loading } = useAdminAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Spin size="large" tip="Đang tải..." />
      </div>
    );
  }

  if (!user || !userDoc || userDoc.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
