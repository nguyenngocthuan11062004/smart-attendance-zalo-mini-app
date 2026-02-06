import React from "react";
import { Spinner } from "zmp-ui";
import { useAtomValue } from "jotai";
import { globalLoadingAtom } from "@/store/ui";

export default function GlobalLoading() {
  const loading = useAtomValue(globalLoadingAtom);
  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-2xl p-6 shadow-xl">
        <Spinner visible />
      </div>
    </div>
  );
}
