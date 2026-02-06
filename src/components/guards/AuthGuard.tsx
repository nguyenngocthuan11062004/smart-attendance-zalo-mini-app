import React from "react";
import { useAtomValue } from "jotai";
import { Navigate } from "react-router-dom";
import { isAuthenticatedAtom } from "@/store/auth";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
