import React, { useEffect } from "react";
import { useAtom } from "jotai";
import { useSnackbar } from "zmp-ui";
import { globalErrorAtom } from "@/store/ui";

export default function ErrorToast() {
  const [error, setError] = useAtom(globalErrorAtom);
  const { openSnackbar } = useSnackbar();

  useEffect(() => {
    if (!error) return;
    openSnackbar({
      text: error,
      type: "error",
      duration: 3000,
    });
    const timer = setTimeout(() => setError(null), 3500);
    return () => clearTimeout(timer);
  }, [error]);

  return null;
}
