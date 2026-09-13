import { Place, District } from '../types/kerala';

/**
 * Calculates straight-line distance in kilometers using the Haversine formula
 */
export function calculateHaversineDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Kerala terrain speed factor:
 * - Mountainous districts (Idukki, Wayanad) have winding ghat hairpin bends (avg 30-35 km/h).
 * - Coastal districts with traffic (Ernakulam, Thiruvananthapuram, Alappuzha) avg 38-44 km/h.
 * - Rural plains avg 45-50 km/h.
 * - Winding factor: Real road distance is ~1.28x to 1.45x the haversine straight line in Kerala.
 */
export function estimateKeralaDrivingDistanceAndMinutes(
  coord1: [number, number],
  coord2: [number, number],
  district1?: District,
  district2?: District
): { distanceKm: number; durationMinutes: number } {
  const directKm = calculateHaversineDistance(coord1, coord2);
  
  if (directKm < 0.2) {
    return { distanceKm: 0, durationMinutes: 0 };
  }

  const isGhat =
    district1 === 'Idukki' ||
    district2 === 'Idukki' ||
    district1 === 'Wayanad' ||
    district2 === 'Wayanad';

  const windingMultiplier = isGhat ? 1.48 : 1.32;
  const roadDistanceKm = Math.max(2, Math.round(directKm * windingMultiplier * 10) / 10);

  // Speed in km/h
  const avgSpeedKmh = isGhat ? 32 : 42;
  const durationMinutes = Math.max(10, Math.round((roadDistanceKm / avgSpeedKmh) * 60));

  return {
    distanceKm: roadDistanceKm,
    durationMinutes,
  };
}

/**
 * Format minutes into readable "Xh Ym"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

/**
 * Convert time string "HH:MM" to minutes from midnight
 */
export function timeStringToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Convert minutes from midnight to "HH:MM AM/PM" or 24h
 */
export function minutesToTimeString(minutes: number, format12h: boolean = true): string {
  let normalized = Math.max(0, minutes % 1440);
  const h = Math.floor(normalized / 60);
  const m = Math.floor(normalized % 60);

  if (!format12h) {
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const displayM = String(m).padStart(2, '0');
  return `${displayH}:${displayM} ${period}`;
}
