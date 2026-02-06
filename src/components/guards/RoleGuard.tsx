import React from "react";
import { useAtomValue } from "jotai";
import { Navigate } from "react-router-dom";
import { userRoleAtom } from "@/store/auth";
import type { UserRole } from "@/types";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const role = useAtomValue(userRoleAtom);

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
