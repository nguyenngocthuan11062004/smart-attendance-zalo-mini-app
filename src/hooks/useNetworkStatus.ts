import { useState, useEffect, useRef } from "react";
import { processOfflineQueue, getQueueSize } from "@/utils/offlineQueue";

export function useNetworkStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const processingRef = useRef(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      // Process offline queue when connection is restored
      if (!processingRef.current) {
        getQueueSize().then((size) => {
          if (size > 0 && !processingRef.current) {
            processingRef.current = true;
            processOfflineQueue().finally(() => {
              processingRef.current = false;
            });
          }
        });
      }
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}
