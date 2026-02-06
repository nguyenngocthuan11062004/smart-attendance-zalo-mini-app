import React from "react";
import { useAtomValue } from "jotai";
import { Navigate } from "react-router-dom";
import { Page, Box, Spinner } from "zmp-ui";
import { isAuthenticatedAtom, authInitializedAtom } from "@/store/auth";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const authInitialized = useAtomValue(authInitializedAtom);

  // Auth state not yet determined – show loading instead of redirecting
  if (!authInitialized) {
    return (
      <Page className="flex items-center justify-center" style={{ minHeight: "100vh" }}>
        <Box className="flex flex-col items-center">
          <Spinner />
        </Box>
      </Page>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
