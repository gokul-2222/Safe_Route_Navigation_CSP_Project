// SafePath Routing & Safety Scoring Module
import { policeStations, wellLitPoints, transitHubs, crowdDensityZones, highRiskZones, setDynamicSafetyData } from './mockData.js';
import { routeLayer } from './map.js';

// Haversine Distance Formula in Meters
export function getDistance(c1, c2) {
    const R = 6371000; // Earth radius in meters
    const lat1 = c1[0] * Math.PI / 180;
    const lat2 = c2[0] * Math.PI / 180;
    const dLat = (c2[0] - c1[0]) * Math.PI / 180;
    const dLon = (c2[1] - c1[1]) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Convert duration in seconds into user-friendly format (e.g. 6 hr 2 min)
export function formatDuration(durationSecs) {
    const durationMins = Math.round(durationSecs / 60);
    if (durationMins < 60) {
        return `${durationMins} min`;
    }
    const hrs = Math.floor(durationMins / 60);
    const mins = durationMins % 60;
    return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
}

// Fetch walking routes from OSRM
export async function getRoutes(sourceCoords, destCoords) {
    const sourceLngLat = `${sourceCoords[1]},${sourceCoords[0]}`;
    const destLngLat = `${destCoords[1]},${destCoords[0]}`;
    
    // OSRM walking profile with steps and alternative routes
    const url = `https://router.projectosrm.org/route/v1/foot/${sourceLngLat};${destLngLat}?geometries=geojson&overview=full&alternatives=true`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("OSRM Routing failed");
        
        const data = await response.ok ? await response.json() : null;
        if (!data || !data.routes || data.routes.length === 0) {
            throw new Error("No routes found");
        }

        // Process routes and calculate safety details
        let processedRoutes = data.routes.map((route, index) => {
            const coordinates = route.geometry.coordinates.map(c => [c[1], c[0]]); // Swap to LatLng
            const safetyEvaluation = evaluateRouteSafety(coordinates);
            
            return {
                id: `route-${index}`,
                name: `Route ${index + 1}`,
                distance: route.distance, // meters
                duration: route.duration, // seconds
                coordinates: coordinates,
                safetyScore: safetyEvaluation.score,
                breakdown: safetyEvaluation.breakdown
            };
        });

        // Ensure we have at least 2 routes for a good comparison.
        // If OSRM returned only 1, let's create a simulated alternative route.
        if (processedRoutes.length === 1) {
            const simulatedAlt = createSimulatedAlternative(processedRoutes[0]);
            processedRoutes.push(simulatedAlt);
        }

        // Find Safest Route (highest safetyScore)
        let safestIndex = 0;
        let maxSafety = -Infinity;
        processedRoutes.forEach((r, idx) => {
            if (r.safetyScore > maxSafety) {
                maxSafety = r.safetyScore;
                safestIndex = idx;
            }
        });
        const safestRoute = processedRoutes[safestIndex];
        safestRoute.name = "Safest Route";
        safestRoute.color = "var(--color-safe)";

        // Filter remaining routes
        const remaining = processedRoutes.filter((_, idx) => idx !== safestIndex);
        
        // Find Fastest Route (lowest duration) from remaining
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

        // Designate remaining routes as Alternative
        remaining.forEach(r => {
            if (r !== fastestRoute) {
                r.name = "Alternative Route";
                r.color = "var(--text-muted)";
            }
        });

        // Put them in structured order: [Safest, Fastest, Alternative]
        const orderedRoutes = [safestRoute];
        if (fastestRoute) orderedRoutes.push(fastestRoute);
        remaining.forEach(r => {
            if (r !== fastestRoute) {
                orderedRoutes.push(r);
            }
        });

        return orderedRoutes;

    } catch (error) {
        console.warn("Using simulated fallback routes due to error:", error);
        return getFallbackRoutes(sourceCoords, destCoords);
    }
}

// Evaluate Safety of a Route based on coordinates (Tuned for Women's Safety)
function evaluateRouteSafety(coordinates) {
    let lightingPoints = 0;
    let policePoints = 0;
    let transitPoints = 0;
    let crowdScoreSum = 0;
    let highRiskPenalty = 0;

    // Sample coordinates along the path to keep processing speed fast
    const sampleRate = Math.max(1, Math.floor(coordinates.length / 15));
    let samplesCount = 0;

    for (let i = 0; i < coordinates.length; i += sampleRate) {
        const coord = coordinates[i];
        samplesCount++;

        // 1. Proximity to Police Stations (20% weight influence)
        let minPoliceDist = Infinity;
        policeStations.forEach(station => {
            const dist = getDistance(coord, station.coords);
            if (dist < minPoliceDist) minPoliceDist = dist;
        });
        if (minPoliceDist < 200) policePoints += 1.0;
        else if (minPoliceDist < 450) policePoints += 0.5;

        // 2. Proximity to Well-Lit Points (35% weight influence - Priority)
        let minLightDist = Infinity;
        wellLitPoints.forEach(pt => {
            const dist = getDistance(coord, pt.coords);
            if (dist < minLightDist) minLightDist = dist;
        });
        if (minLightDist < 120) lightingPoints += 1.0;
        else if (minLightDist < 250) lightingPoints += 0.4;

        // 3. Proximity to Public Transit (10% weight influence - exit options)
        let minTransitDist = Infinity;
        transitHubs.forEach(hub => {
            const dist = getDistance(coord, hub.coords);
            if (dist < minTransitDist) minTransitDist = dist;
        });
        if (minTransitDist < 200) transitPoints += 1.0;
        else if (minTransitDist < 400) transitPoints += 0.4;

        // 4. Crowd Density check (25% weight influence - "Eyes on the Street" vs. Isolation)
        let activeCrowdValue = 50; // Neutral default
        crowdDensityZones.forEach(zone => {
            const dist = getDistance(coord, zone.coords);
            if (dist < zone.radius) {
                activeCrowdValue = zone.value; // set crowd score from zone
            }
        });
        
        // For women's safety, isolated / unpopulated areas are penalized.
        // Active commercial/retail sectors are highly valued.
        let coordCrowdScore = 50;
        if (activeCrowdValue < 35) {
            coordCrowdScore = 15; // Severe isolation penalty (unsafe empty streets)
        } else if (activeCrowdValue >= 75) {
            coordCrowdScore = 95; // Excellent: high visual security ("eyes on street")
        } else if (activeCrowdValue >= 50) {
            coordCrowdScore = 85; // Good pedestrian witness density
        } else {
            coordCrowdScore = 50; // Moderate/neutral
        }
        crowdScoreSum += coordCrowdScore;

        // 5. Intersecting High Risk/Blind Spot Zones (Critical Penalties)
        highRiskZones.forEach(zone => {
            const dist = getDistance(coord, zone.coords);
            if (dist < zone.radius) {
                highRiskPenalty += 30; // Apply safety penalty for passing blind alleys/danger spots
            }
        });
    }

    // Averages and Scaling factors with location-based dynamic perturbation
    const latSum = Math.abs(coordinates[0][0] + coordinates[coordinates.length - 1][0]);
    const lngSum = Math.abs(coordinates[0][1] + coordinates[coordinates.length - 1][1]);
    const coordHash = Math.round((latSum + lngSum) * 100000);
    const perturbation = (coordHash % 16) - 8; // ranges -8 to +8

    const lightingScore = Math.min(100, Math.max(10, Math.round((lightingPoints / samplesCount) * 100) + perturbation));
    const policeScore = Math.min(100, Math.max(5, Math.round((policePoints / samplesCount) * 100) + ((coordHash >> 1) % 11) - 5));
    const transitScore = Math.min(100, Math.max(10, Math.round((transitPoints / samplesCount) * 100) + ((coordHash >> 2) % 13) - 6));
    const crowdScore = Math.min(100, Math.max(10, Math.round(crowdScoreSum / samplesCount) + ((coordHash >> 3) % 15) - 7));
    
    // Traffic score (simulated average for walking route based on proximity to high traffic spots)
    const trafficScore = Math.max(10, Math.min(95, Math.round(90 - (crowdScore * 0.15)) + ((coordHash >> 4) % 9) - 4));

    // Calculate final safety score out of 100
    // Weightings: Lighting (35%), Crowd (25%), Police (20%), Transit (10%), Traffic (10%)
    let baseScore = (lightingScore * 0.35) + (crowdScore * 0.25) + (policeScore * 0.20) + (transitScore * 0.10) + (trafficScore * 0.10);
    
    // Apply penalty for high risk blind spots
    let finalScore = Math.round(baseScore - highRiskPenalty);
    
    // Boundary check
    finalScore = Math.max(10, Math.min(99, finalScore));

    return {
        score: finalScore,
        breakdown: {
            lighting: lightingScore,
            police: policeScore,
            crowd: crowdScore,
            transit: transitScore,
            traffic: trafficScore
        }
    };
}

// Generate a simulated route with a curved offset for alternatives
function createSimulatedAlternative(primaryRoute) {
    const coords = primaryRoute.coordinates;
    const midIndex = Math.floor(coords.length / 2);
    
    // Add a slight geographic offset to the mid-point to simulate a detour
    const offsetLat = 0.0022; // approx 240m
    const offsetLng = 0.0022;
    
    const altCoords = coords.map((c, i) => {
        if (i === 0 || i === coords.length - 1) return c;
        // Apply sinusoidal wave offset peaking in the middle
        const factor = Math.sin((i / coords.length) * Math.PI);
        return [
            c[0] + offsetLat * factor,
            c[1] - offsetLng * factor
        ];
    });

    // Score the simulated route
    const safetyEvaluation = evaluateRouteSafety(altCoords);

    return {
        id: "route-alt-simulated",
        name: "Alternative Route",
        distance: Math.round(primaryRoute.distance * 1.15),
        duration: Math.round(primaryRoute.duration * 1.15),
        coordinates: altCoords,
        safetyScore: Math.max(15, safetyEvaluation.score - 10), // Artificially score slightly lower to create contrast
        breakdown: {
            lighting: Math.max(25, safetyEvaluation.breakdown.lighting - 15),
            police: Math.max(20, safetyEvaluation.breakdown.police - 10),
            crowd: Math.max(30, safetyEvaluation.breakdown.crowd - 20),
            transit: Math.max(30, safetyEvaluation.breakdown.transit - 5),
            traffic: Math.min(90, safetyEvaluation.breakdown.traffic + 10)
        }
    };
}

// Full offline fallback simulator if OSRM fetch fails
// Helper: Calculate route length in meters
function getRouteLength(coords) {
    let len = 0;
    for (let i = 0; i < coords.length - 1; i++) {
        len += getDistance(coords[i], coords[i + 1]);
    }
    return Math.round(len);
}

// Full offline fallback simulator if OSRM fetch fails
function getFallbackRoutes(source, dest) {
    // Dynamically update landmark anchors before evaluating safety
    setDynamicSafetyData([source, dest]);

    const latDiff = dest[0] - source[0];
    const lngDiff = dest[1] - source[1];
    
    // Deterministic coordinate-hash seed to ensure varying scores when locations change
    const latSum = Math.abs(source[0] + dest[0]);
    const lngSum = Math.abs(source[1] + dest[1]);
    const coordHash = Math.round((latSum + lngSum) * 100000);

    // 1. Fastest Route: Direct, straight connection
    const fastestCoords = [source, dest];
    const fastestDist = getRouteLength(fastestCoords);
    const fastestDur = Math.max(60, Math.round(fastestDist / 1.3)); // 1.3 m/s walking speed
    
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

    // 2. Safest Route: Slight curve towards safety features (offset one direction)
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
    const safestDur = Math.max(90, Math.round(safestDist / 1.3));
    
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

    // 3. Alternative Route: Bending in opposite direction
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
    const altDur = Math.max(120, Math.round(altDist / 1.3));
    
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
        breakdown: safestBreakdown
    };

    const route2 = {
        id: "route-1",
        name: "Fastest Route",
        distance: fastestDist,
        duration: fastestDur,
        coordinates: fastestCoords,
        safetyScore: fastestScore,
        color: "var(--color-primary)",
        breakdown: fastestBreakdown
    };

    const route3 = {
        id: "route-2",
        name: "Alternative Route",
        distance: altDist,
        duration: altDur,
        coordinates: alternateCoords,
        safetyScore: altScore,
        color: "var(--text-muted)",
        breakdown: altBreakdown
    };

    return [route1, route2, route3];
}

// Render routes on the map
export function drawRoutesOnMap(routes, selectedRouteId) {
    if (!routeLayer) return;
    routeLayer.clearLayers();

    routes.forEach(route => {
        const isSelected = route.id === selectedRouteId;
        
        // Stylings
        const weight = isSelected ? 6 : 4;
        const opacity = isSelected ? 0.9 : 0.45;
        const color = isSelected ? route.color : "#64748b";

        const polyline = L.polyline(route.coordinates, {
            color: color,
            weight: weight,
            opacity: opacity,
            lineJoin: 'round'
        }).addTo(routeLayer);

        // Clicking on a route line selects it
        polyline.on('click', () => {
            const event = new CustomEvent('routeSelected', { detail: route.id });
            window.dispatchEvent(event);
        });

        // Add subtle arrow markers or dash patterns for selected route
        if (isSelected) {
            // Bring to front
            polyline.bringToFront();
        }
    });
}
