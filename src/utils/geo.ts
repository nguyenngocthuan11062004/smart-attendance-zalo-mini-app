import type { GeoLocation } from "@/types";

/**
 * Tính khoảng cách giữa 2 tọa độ GPS (Haversine formula)
 * Trả về khoảng cách tính bằng mét
 */
export function calculateDistance(
  point1: GeoLocation,
  point2: GeoLocation
): number {
  const R = 6371000; // Bán kính Trái Đất (mét)
  const lat1 = (point1.latitude * Math.PI) / 180;
  const lat2 = (point2.latitude * Math.PI) / 180;
  const dLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const dLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Kiểm tra SV có trong phạm vi cho phép không
 * @param studentLocation - Vị trí SV
 * @param sessionLocation - Vị trí phiên (GV set)
 * @param radiusMeters - Bán kính cho phép (mặc định 200m)
 * @returns { inRange, distance }
 */
export function checkGeoFence(
  studentLocation: GeoLocation,
  sessionLocation: GeoLocation,
  radiusMeters: number = 200
): { inRange: boolean; distance: number } {
  const distance = calculateDistance(studentLocation, sessionLocation);
  return {
    inRange: distance <= radiusMeters,
    distance: Math.round(distance),
  };
}
