export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Great-circle distance in km between two coordinates (haversine formula). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** « 850 m » under 1 km, then « 2,4 km » / « 18 km ». */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  const rounded = Math.round(km * 10) / 10;
  return `${rounded.toFixed(1).replace('.', ',')} km`;
}
