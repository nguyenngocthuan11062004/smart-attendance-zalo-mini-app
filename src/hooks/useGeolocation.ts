import { useState, useCallback } from "react";
import type { GeoLocation } from "@/types";

interface UseGeolocationResult {
  location: GeoLocation | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => Promise<GeoLocation | null>;
}

export function useGeolocation(): UseGeolocationResult {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(async (): Promise<GeoLocation | null> => {
    if (!navigator.geolocation) {
      setError("Trình duyệt không hỗ trợ GPS");
      return null;
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const geo: GeoLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setLocation(geo);
          setLoading(false);
          resolve(geo);
        },
        (err) => {
          let msg: string;
          switch (err.code) {
            case err.PERMISSION_DENIED:
              msg = "Quyền truy cập vị trí bị từ chối";
              break;
            case err.POSITION_UNAVAILABLE:
              msg = "Không thể lấy vị trí";
              break;
            case err.TIMEOUT:
              msg = "Hết thời gian chờ GPS";
              break;
            default:
              msg = "Lỗi GPS không xác định";
          }
          setError(msg);
          setLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }, []);

  return { location, loading, error, requestLocation };
}
