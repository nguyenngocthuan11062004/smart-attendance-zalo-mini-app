import React from "react";
import { Spinner } from "zmp-ui";
import { useAtomValue } from "jotai";
import { globalLoadingAtom } from "@/store/ui";

export default function GlobalLoading() {
  const loading = useAtomValue(globalLoadingAtom);
  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#ffffff", borderRadius: 20, padding: 24, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <Spinner visible />
      </div>
    </div>
  );
}
