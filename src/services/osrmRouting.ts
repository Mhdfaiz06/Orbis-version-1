/**
 * OSRM (Open Source Routing Machine) Service
 * Fetches real road network polylines, travel distances, and predicted travel times.
 */

export interface OSRMRouteResult {
  coordinates: [number, number][]; // [lat, lng] road path
  distanceKm: number;
  durationMinutes: number;
  summaryRoads: string[];
  isRealRoad: boolean;
}

// In-memory cache to prevent repetitive network calls
const routeCache = new Map<string, OSRMRouteResult>();

/**
 * Fetch real driving route between two coordinates via OSRM public API
 */
export async function fetchOSRMRoute(
  start: [number, number],
  end: [number, number],
  district1?: string,
  district2?: string
): Promise<OSRMRouteResult> {
  const [lat1, lon1] = start;
  const [lat2, lon2] = end;

  // Cache key rounded to ~100 meters
  const cacheKey = `${lat1.toFixed(3)},${lon1.toFixed(3)}->${lat2.toFixed(3)},${lon2.toFixed(3)}`;
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  // Fallback curve calculation in case of network timeout or offline
  const fallbackResult: OSRMRouteResult = generateTerrainFallbackRoute(start, end, district1, district2);

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson&steps=true`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`OSRM API error: ${res.status}`);
    }

    const data = await res.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      
      // GeoJSON coordinates are [lon, lat] -> convert to Leaflet [lat, lon]
      const coords: [number, number][] = route.geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]]
      );

      const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
      
      // Kerala terrain calibration:
      // OSRM raw duration is based on optimal highway speeds.
      // Kerala ghats (Idukki, Wayanad) and coastal narrow lanes have real-world speed reductions.
      const isGhat = district1 === 'Idukki' || district2 === 'Idukki' || district1 === 'Wayanad' || district2 === 'Wayanad';
      const trafficMultiplier = isGhat ? 1.25 : 1.15;
      const durationMinutes = Math.max(10, Math.round((route.duration / 60) * trafficMultiplier));

      // Extract notable road names
      const steps = route.legs?.[0]?.steps || [];
      const roadNames: string[] = Array.from(
        new Set(
          steps
            .map((s: any) => s.name)
            .filter((n: string) => n && n.trim().length > 1 && !n.includes('unnamed'))
        )
      ).slice(0, 3) as string[];

      const result: OSRMRouteResult = {
        coordinates: coords,
        distanceKm,
        durationMinutes,
        summaryRoads: roadNames.length > 0 ? roadNames : ['Kerala Highway / State Road'],
        isRealRoad: true,
      };

      routeCache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    console.warn('OSRM routing fetch failed or timed out, using calibrated Kerala path fallback:', err);
  }

  routeCache.set(cacheKey, fallbackResult);
  return fallbackResult;
}

/**
 * Fallback curved route generator when OSRM is unreachable
 */
function generateTerrainFallbackRoute(
  start: [number, number],
  end: [number, number],
  district1?: string,
  district2?: string
): OSRMRouteResult {
  const [lat1, lon1] = start;
  const [lat2, lon2] = end;

  // Straight line haversine
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const directKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const isGhat = district1 === 'Idukki' || district2 === 'Idukki' || district1 === 'Wayanad' || district2 === 'Wayanad';
  const windingMultiplier = isGhat ? 1.48 : 1.32;
  const roadDistanceKm = Math.max(2, Math.round(directKm * windingMultiplier * 10) / 10);
  const avgSpeed = isGhat ? 32 : 42;
  const durationMinutes = Math.max(10, Math.round((roadDistanceKm / avgSpeed) * 60));

  // Generate realistic smooth curved intermediate points
  const points: [number, number][] = [start];
  const steps = 6;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const interLat = lat1 + (lat2 - lat1) * t;
    const interLon = lon1 + (lon2 - lon1) * t;

    // Add slight natural geographical bend
    const perpendicularOffset = Math.sin(t * Math.PI) * 0.018 * (isGhat ? 1.5 : 0.8);
    points.push([interLat + perpendicularOffset, interLon - perpendicularOffset * 0.5]);
  }
  points.push(end);

  return {
    coordinates: points,
    distanceKm: roadDistanceKm,
    durationMinutes,
    summaryRoads: [isGhat ? 'Western Ghats Scenic Pass' : 'Kerala Coastal Road (NH 66)'],
    isRealRoad: false,
  };
}
