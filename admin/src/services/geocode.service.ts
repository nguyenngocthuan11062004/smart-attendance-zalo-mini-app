/**
 * Reverse geocoding via OpenStreetMap Nominatim (free, no API key).
 *
 * Hạn chế: 1 request/giây. Cache trong memory để tránh gọi lại cùng tọa độ.
 * Dùng key tròn xuống 4 chữ số thập phân (~11m precision) — đủ cho địa chỉ.
 */

const cache = new Map<string, string>();

interface NominatimAddress {
  road?: string;
  house_number?: string;
  suburb?: string;
  quarter?: string;
  city_district?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
}

interface NominatimResponse {
  display_name?: string;
  address?: NominatimAddress;
}

function formatAddress(data: NominatimResponse): string {
  const a = data.address;
  if (!a) return data.display_name || "";

  // Ưu tiên: số nhà + đường + quận, thành phố
  const parts: string[] = [];
  const street = [a.house_number, a.road].filter(Boolean).join(" ");
  if (street) parts.push(street);

  const district = a.suburb || a.quarter || a.city_district;
  if (district) parts.push(district);

  const city = a.city || a.town || a.village;
  if (city) parts.push(city);

  if (parts.length === 0) {
    // Fallback về display_name nhưng cắt bớt cuối
    return (data.display_name || "").split(",").slice(0, 4).join(",").trim();
  }

  return parts.join(", ");
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (cache.has(key)) return cache.get(key) || null;

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=vi&zoom=18`;
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResponse;
    const formatted = formatAddress(data);
    if (formatted) {
      cache.set(key, formatted);
      return formatted;
    }
    return null;
  } catch {
    return null;
  }
}

export function formatCoords(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${ns}, ${Math.abs(lon).toFixed(4)}°${ew}`;
}
