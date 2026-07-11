// SafePath Live Tracking & Location Sharing Module
import { getMap, recenterMap } from './map.js';
import { getDistance, formatDuration } from './routing.js';
import { policeStations, wellLitPoints, transitHubs } from './mockData.js';

let trackingInterval = null;
let simulatedUserMarker = null;
let journeyRoute = null;
let currentCoordsIndex = 0;
let onProgressUpdate = null;
let onSafetyAlert = null;
let onJourneyFinished = null;

// Interpolate coordinate list to provide smooth walking steps
function interpolateCoordinates(coords, numSteps = 25) {
    if (coords.length < 2) return coords;
    
    const interpolated = [];
    const segments = coords.length - 1;
    const stepsPerSegment = Math.max(2, Math.round(numSteps / segments));
    
    for (let i = 0; i < segments; i++) {
        const start = coords[i];
        const end = coords[i + 1];
        
        for (let j = 0; j < stepsPerSegment; j++) {
            const t = j / stepsPerSegment;
            interpolated.push([
                start[0] + (end[0] - start[0]) * t,
                start[1] + (end[1] - start[1]) * t
            ]);
        }
    }
    interpolated.push(coords[coords.length - 1]);
    return interpolated;
}

// Start Journey Simulation
export function startJourneySimulation(route, onProgress, onAlert, onFinished, resumeIndex = 0) {
    if (trackingInterval) {
        stopJourneySimulation();
    }

    journeyRoute = route;
    onProgressUpdate = onProgress;
    onSafetyAlert = onAlert;
    onJourneyFinished = onFinished;

    const map = getMap();
    if (!map) return;

    // Create custom pulsing user location marker
    const icon = L.divIcon({
        className: 'safety-marker',
        html: `<div class="marker-inner pulse-indicator" style="background-color: #3b82f6; border-color: white; width: 24px; height: 24px;"><i class="fa-solid fa-person-walking" style="font-size: 0.75rem;"></i></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    // Interpolate coordinate lists to ensure a paced simulation of ~25 steps
    const coordinates = interpolateCoordinates(route.coordinates, 25);
    
    currentCoordsIndex = Math.min(resumeIndex, coordinates.length - 1);
    const startCoords = coordinates[currentCoordsIndex];
    
    simulatedUserMarker = L.marker(startCoords, { icon }).addTo(map);
    simulatedUserMarker.bindPopup("<strong>My Live Location</strong><br>Status: Navigating Safely").openPopup();
    
    recenterMap(startCoords, 16);

    // Persist tracking state to localStorage to prevent lost state during tab switching or reloads
    const journeyState = {
        route: route,
        currentCoordsIndex: currentCoordsIndex
    };
    localStorage.setItem('safepath_active_journey', JSON.stringify(journeyState));

    // Simulate stepping along the coordinate array to complete in exactly 5 minutes (300,000 ms)
    const stepDuration = Math.round(300000 / coordinates.length);

    trackingInterval = setInterval(() => {
        currentCoordsIndex++;
        
        if (currentCoordsIndex >= coordinates.length) {
            // Reached destination
            stopJourneySimulation();
            if (onJourneyFinished) onJourneyFinished();
            return;
        }

        const nextCoords = coordinates[currentCoordsIndex];
        
        // Move Marker on Map
        if (simulatedUserMarker) {
            simulatedUserMarker.setLatLng(nextCoords);
        }

        // Center map occasionally
        if (currentCoordsIndex % 3 === 0) {
            recenterMap(nextCoords, 16);
        }

        // Save progress index to localStorage
        const savedStateStr = localStorage.getItem('safepath_active_journey');
        if (savedStateStr) {
            const savedState = JSON.parse(savedStateStr);
            savedState.currentCoordsIndex = currentCoordsIndex;
            localStorage.setItem('safepath_active_journey', JSON.stringify(savedState));
        }

        // Calculate progress percentage
        const progressPct = Math.round((currentCoordsIndex / (coordinates.length - 1)) * 100);
        
        // Estimate remaining duration
        const pctRemaining = (coordinates.length - 1 - currentCoordsIndex) / (coordinates.length - 1);
        const remDurationSec = Math.round(route.duration * pctRemaining);
        const remDurationFormatted = formatDuration(remDurationSec);

        // Calculate exact remaining distance
        let remDist = 0;
        for (let idx = currentCoordsIndex; idx < coordinates.length - 1; idx++) {
            remDist += getDistance(coordinates[idx], coordinates[idx + 1]);
        }
        const remDistFormatted = remDist >= 1000 ? `${(remDist / 1000).toFixed(1)} km` : `${Math.round(remDist)} m`;

        if (onProgressUpdate) {
            onProgressUpdate(progressPct, remDurationFormatted, remDistFormatted);
        }

        // Perform active proximity scans for safety milestones
        checkProximityMilestones(nextCoords);

    }, stepDuration);
}

// Stop Journey Simulation
export function stopJourneySimulation() {
    if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
    }

    const map = getMap();
    if (map && simulatedUserMarker) {
        map.removeLayer(simulatedUserMarker);
        simulatedUserMarker = null;
    }

    journeyRoute = null;
    currentCoordsIndex = 0;
    
    // Clear persisted journey
    localStorage.removeItem('safepath_active_journey');
}

// Active Safety Milestone Checks during journey
function checkProximityMilestones(coords) {
    if (!onSafetyAlert) return;

    // A. Detect police station nearby
    policeStations.forEach(station => {
        const dist = getDistance(coords, station.coords);
        if (dist < 100 && !station.triggered) {
            station.triggered = true; // prevent repeated triggers
            onSafetyAlert(`Entering high security area: close to ${station.name}.`, 'safe');
            setTimeout(() => { station.triggered = false; }, 60000); // Reset cooldown
        }
    });

    // B. Detect well-lit corridor
    wellLitPoints.forEach(pt => {
        const dist = getDistance(coords, pt.coords);
        if (dist < 80 && !pt.triggered) {
            pt.triggered = true;
            onSafetyAlert(`Passing under well-lit street: ${pt.name}.`, 'info');
            setTimeout(() => { pt.triggered = false; }, 40000);
        }
    });

    // C. Detect Transit Access
    transitHubs.forEach(hub => {
        const dist = getDistance(coords, hub.coords);
        if (dist < 80 && !hub.triggered) {
            hub.triggered = true;
            onSafetyAlert(`Passing busy transit hub: ${hub.name}. Bystanders present.`, 'info');
            setTimeout(() => { hub.triggered = false; }, 45000);
        }
    });
}

// Generate Live Location Sharing Link
export function generateTrackingLink(routeId) {
    const tripId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const mockTrackingURL = `${window.location.origin}${window.location.pathname}?tripId=TRK-${tripId}&routeId=${routeId}`;
    return {
        url: mockTrackingURL,
        id: `TRK-${tripId}`
    };
}
