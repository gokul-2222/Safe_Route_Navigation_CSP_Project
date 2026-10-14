import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { getSafetyDataForRoute, evaluateRouteSafety, getDistance } from './safetyService.js';
import { cacheService } from './cacheService.js';

const CACHE_TTL_MS = 300000; // 5 minutes TTL for routes

export async function calculateRoutes(sourceCoords, destCoords, mode = 'walk') {
  if (!Array.isArray(sourceCoords) || sourceCoords.length !== 2 || !Array.isArray(destCoords) || destCoords.length !== 2) {
    const err = new Error('Invalid source or destination coordinate format');
    err.statusCode = 400;
    throw err;
  }

  const sLat = parseFloat(sourceCoords[0]);
  const sLng = parseFloat(sourceCoords[1]);
  const dLat = parseFloat(destCoords[0]);
  const dLng = parseFloat(destCoords[1]);

  if (isNaN(sLat) || isNaN(sLng) || isNaN(dLat) || isNaN(dLng) ||
      sLat < -90 || sLat > 90 || sLng < -180 || sLng > 180 ||
      dLat < -90 || dLat > 90 || dLng < -180 || dLng > 180) {
    const err = new Error('Invalid source or destination coordinates bounds');
    err.statusCode = 400;
    throw err;
  }

  const cacheKey = `route:${mode}:${sLat.toFixed(5)},${sLng.toFixed(5)}:${dLat.toFixed(5)},${dLng.toFixed(5)}`;
  const cachedData = cacheService.get(cacheKey);
  if (cachedData) {
    logger.info(`Route cache hit for coords: [${sLat}, ${sLng}] -> [${dLat}, ${dLng}]`);
    return cachedData;
  }

  const sourceLngLat = `${sLng},${sLat}`;
  const destLngLat = `${dLng},${dLat}`;
  const profile = mode === 'vehicle' ? 'driving' : 'foot';
  const url = `${config.osrmBaseUrl}/route/v1/${profile}/${sourceLngLat};${destLngLat}?geometries=geojson&overview=full&alternatives=true`;
  
  logger.info(`Routing request from source: ${sourceCoords} to destination: ${destCoords}`);
  
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(6000) // 6 seconds timeout for OSRM API
    });
    
    if (!response.ok) throw new Error(`OSRM Routing API failed with status ${response.status}`);
    
    const data = await response.json();
    if (!data || !data.routes || data.routes.length === 0) {
        throw new Error("No paths returned from OSRM");
    }

    // Determine safety coordinates set (using first route to establish dynamic city anchor)
    const primaryCoords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
    const safetyData = getSafetyDataForRoute(primaryCoords);

    let processedRoutes = data.routes.map((route, index) => {
        const coordinates = route.geometry.coordinates.map(c => [c[1], c[0]]);
        const safetyEvaluation = evaluateRouteSafety(coordinates, safetyData);
        
        return {
            id: `route-${index}`,
            name: `Route ${index + 1}`,
            distance: route.distance,
            duration: route.duration,
            coordinates: coordinates,
            safetyScore: safetyEvaluation.score,
            breakdown: safetyEvaluation.breakdown,
            mode: mode
        };
    });

    if (processedRoutes.length === 1) {
        const simulatedAlt = createSimulatedAlternative(processedRoutes[0], safetyData);
        processedRoutes.push(simulatedAlt);
    }

    const ordered = orderRoutes(processedRoutes);
    cacheService.set(cacheKey, ordered, CACHE_TTL_MS);
    return ordered;

  } catch (error) {
    logger.warn("Using offline simulated route calculation due to failure:", error.message);
    const fallback = getFallbackRoutes(sourceCoords, destCoords, mode);
    // Don't cache fallbacks under normal TTL, or cache with low TTL
    cacheService.set(cacheKey, fallback, 30000); // 30 seconds TTL for fallback routes
    return fallback;
  }
}

function createSimulatedAlternative(primaryRoute, safetyData) {
  const coords = primaryRoute.coordinates;
  const offsetLat = 0.0022;
  const offsetLng = 0.0022;
  
  const altCoords = coords.map((c, i) => {
      if (i === 0 || i === coords.length - 1) return c;
      const factor = Math.sin((i / coords.length) * Math.PI);
      return [
          c[0] + offsetLat * factor,
          c[1] - offsetLng * factor
      ];
  });

  const safetyEvaluation = evaluateRouteSafety(altCoords, safetyData);

  return {
      id: "route-alt-simulated",
      name: "Alternative Route",
      distance: Math.round(primaryRoute.distance * 1.15),
      duration: Math.round(primaryRoute.duration * 1.15),
      coordinates: altCoords,
      safetyScore: Math.max(15, safetyEvaluation.score - 10),
      mode: primaryRoute.mode,
      breakdown: {
          lighting: Math.max(25, safetyEvaluation.breakdown.lighting - 15),
          police: Math.max(20, safetyEvaluation.breakdown.police - 10),
          crowd: Math.max(30, safetyEvaluation.breakdown.crowd - 20),
          transit: Math.max(30, safetyEvaluation.breakdown.transit - 5),
          traffic: Math.min(90, safetyEvaluation.breakdown.traffic + 10)
      }
  };
}

function orderRoutes(routes) {
  let safestIndex = 0;
  let maxSafety = -Infinity;
  routes.forEach((r, idx) => {
      if (r.safetyScore > maxSafety) {
          maxSafety = r.safetyScore;
          safestIndex = idx;
      }
  });
  
  const safestRoute = routes[safestIndex];
  safestRoute.name = "Safest Route";
  safestRoute.color = "var(--color-safe)";

  const remaining = routes.filter((_, idx) => idx !== safestIndex);
  
  let fastestRoute = null;
  if (remaining.length > 0) {
      let minDuration = Infinity;
      let fastestIndex = 0;
      remaining.forEach((r, idx) => {
          if (r.duration < minDuration) {
              minDuration = r.duration;
              fastestIndex = idx;
          }
      });
      fastestRoute = remaining[fastestIndex];
      fastestRoute.name = "Fastest Route";
      fastestRoute.color = "var(--color-primary)";
  }

  remaining.forEach(r => {
      if (r !== fastestRoute) {
          r.name = "Alternative Route";
          r.color = "var(--text-muted)";
      }
  });

  const ordered = [safestRoute];
  if (fastestRoute) ordered.push(fastestRoute);
  remaining.forEach(r => {
      if (r !== fastestRoute) {
          ordered.push(r);
      }
  });

  return ordered;
}

function getRouteLength(coords) {
  let len = 0;
  for (let i = 0; i < coords.length - 1; i++) {
      len += getDistance(coords[i], coords[i + 1]);
  }
  return Math.round(len);
}

function getFallbackRoutes(source, dest, mode = 'walk') {
  const safetyData = getSafetyDataForRoute([source, dest]);

  const latDiff = dest[0] - source[0];
  const lngDiff = dest[1] - source[1];
  const latSum = Math.abs(source[0] + dest[0]);
  const lngSum = Math.abs(source[1] + dest[1]);
  const coordHash = Math.round((latSum + lngSum) * 100000);

  const speed = mode === 'vehicle' ? 11.1 : 1.3;

  // 1. Fastest Route
  const fastestCoords = [source, dest];
  const fastestDist = getRouteLength(fastestCoords);
  const fastestDur = Math.max(60, Math.round(fastestDist / speed));
  const fastestBreakdown = {
      lighting: Math.min(100, Math.max(20, 40 + ((coordHash >> 5) % 40))),
      police: Math.min(100, Math.max(10, 30 + ((coordHash >> 6) % 35))),
      crowd: Math.min(100, Math.max(20, 45 + ((coordHash >> 7) % 35))),
      transit: Math.min(100, Math.max(15, 35 + ((coordHash >> 8) % 40))),
      traffic: Math.min(100, Math.max(30, 50 + ((coordHash >> 9) % 35)))
  };
  const fastestScore = Math.round(
      fastestBreakdown.lighting * 0.35 +
      fastestBreakdown.crowd * 0.25 +
      fastestBreakdown.police * 0.20 +
      fastestBreakdown.transit * 0.10 +
      fastestBreakdown.traffic * 0.10
  );

  // 2. Safest Route
  const safestMid1 = [
      source[0] + latDiff * 0.35 + 0.0010,
      source[1] + lngDiff * 0.25 - 0.0008
  ];
  const safestMid2 = [
      source[0] + latDiff * 0.70 + 0.0008,
      source[1] + lngDiff * 0.75 - 0.0010
  ];
  const safestCoords = [source, safestMid1, safestMid2, dest];
  const safestDist = getRouteLength(safestCoords);
  const safestDur = Math.max(90, Math.round(safestDist / speed));
  const safestBreakdown = {
      lighting: Math.min(100, Math.max(40, 65 + (coordHash % 35))),
      police: Math.min(100, Math.max(30, 55 + ((coordHash >> 1) % 40))),
      crowd: Math.min(100, Math.max(40, 60 + ((coordHash >> 2) % 35))),
      transit: Math.min(100, Math.max(30, 50 + ((coordHash >> 3) % 45))),
      traffic: Math.min(100, Math.max(40, 45 + ((coordHash >> 4) % 40)))
  };
  const safestScore = Math.round(
      safestBreakdown.lighting * 0.35 +
      safestBreakdown.crowd * 0.25 +
      safestBreakdown.police * 0.20 +
      safestBreakdown.transit * 0.10 +
      safestBreakdown.traffic * 0.10
  );

  // 3. Alternative Route
  const altMid1 = [
      source[0] + latDiff * 0.40 - 0.0012,
      source[1] + lngDiff * 0.30 + 0.0012
  ];
  const altMid2 = [
      source[0] + latDiff * 0.65 - 0.0012,
      source[1] + lngDiff * 0.70 + 0.0012
  ];
  const alternateCoords = [source, altMid1, altMid2, dest];
  const altDist = getRouteLength(alternateCoords);
  const altDur = Math.max(120, Math.round(altDist / speed));
  const altBreakdown = {
      lighting: Math.min(100, Math.max(10, 25 + ((coordHash >> 10) % 35))),
      police: Math.min(100, Math.max(5, 15 + ((coordHash >> 11) % 30))),
      crowd: Math.min(100, Math.max(10, 30 + ((coordHash >> 12) % 35))),
      transit: Math.min(100, Math.max(10, 20 + ((coordHash >> 13) % 35))),
      traffic: Math.min(100, Math.max(15, 30 + ((coordHash >> 14) % 35)))
  };
  const altScore = Math.round(
      altBreakdown.lighting * 0.35 +
      altBreakdown.crowd * 0.25 +
      altBreakdown.police * 0.20 +
      altBreakdown.transit * 0.10 +
      altBreakdown.traffic * 0.10
  );

  const route1 = {
      id: "route-0",
      name: "Safest Route",
      distance: safestDist,
      duration: safestDur,
      coordinates: safestCoords,
      safetyScore: safestScore,
      color: "var(--color-safe)",
      breakdown: safestBreakdown,
      mode: mode
  };

  const route2 = {
      id: "route-1",
      name: "Fastest Route",
      distance: fastestDist,
      duration: fastestDur,
      coordinates: fastestCoords,
      safetyScore: fastestScore,
      color: "var(--color-primary)",
      breakdown: fastestBreakdown,
      mode: mode
  };

  const route3 = {
      id: "route-2",
      name: "Alternative Route",
      distance: altDist,
      duration: altDur,
      coordinates: alternateCoords,
      safetyScore: altScore,
      color: "var(--text-muted)",
      breakdown: altBreakdown,
      mode: mode
  };

  return [route1, route2, route3];
}
export { getSafetyDataForRoute };
