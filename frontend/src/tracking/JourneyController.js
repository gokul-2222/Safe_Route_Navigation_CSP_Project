import { MapState, JourneyState } from '../state/State.js';
import { MapManager } from '../map/MapManager.js';

function getDistance(c1, c2) {
    const R = 6371000;
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

function formatDuration(durationSecs) {
    const durationMins = Math.round(durationSecs / 60);
    if (durationMins < 60) {
        return `${durationMins} min`;
    }
    const hrs = Math.floor(durationMins / 60);
    const mins = durationMins % 60;
    return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
}

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

export const JourneyController = {
  start(route, safetyData, onProgress, onAlert, onFinished, resumeIndex = 0) {
    if (JourneyState.trackingInterval) {
        this.stop();
    }

    JourneyState.activeJourneyRoute = route;

    // Create user locator custom icon
    const icon = L.divIcon({
        className: 'safety-marker',
        html: `<div class="marker-inner pulse-indicator" style="background-color: #3b82f6; border-color: white; width: 24px; height: 24px;"><i class="fa-solid fa-person-walking" style="font-size: 0.75rem;"></i></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    const coordinates = interpolateCoordinates(route.coordinates, 25);
    JourneyState.currentCoordsIndex = Math.min(resumeIndex, coordinates.length - 1);
    
    const startCoords = coordinates[JourneyState.currentCoordsIndex];
    JourneyState.simulatedUserMarker = L.marker(startCoords, { icon }).addTo(MapState.mapInstance);
    JourneyState.simulatedUserMarker.bindPopup("<strong>My Live Location</strong><br>Status: Navigating Safely").openPopup();
    
    MapManager.recenter(startCoords, 16);

    // Cache simulation state to local storage
    localStorage.setItem('safepath_active_journey', JSON.stringify({
        route: route,
        safetyData: safetyData,
        currentCoordsIndex: JourneyState.currentCoordsIndex
    }));

    const stepDuration = Math.round(300000 / coordinates.length);

    JourneyState.trackingInterval = setInterval(() => {
        JourneyState.currentCoordsIndex++;
        
        if (JourneyState.currentCoordsIndex >= coordinates.length) {
            this.stop();
            if (onFinished) onFinished();
            return;
        }

        const nextCoords = coordinates[JourneyState.currentCoordsIndex];
        
        if (JourneyState.simulatedUserMarker) {
            JourneyState.simulatedUserMarker.setLatLng(nextCoords);
        }

        if (JourneyState.currentCoordsIndex % 3 === 0) {
            MapManager.recenter(nextCoords, 16);
        }

        // Update cache index
        const saved = localStorage.getItem('safepath_active_journey');
        if (saved) {
            const parsed = JSON.parse(saved);
            parsed.currentCoordsIndex = JourneyState.currentCoordsIndex;
            localStorage.setItem('safepath_active_journey', JSON.stringify(parsed));
        }

        const progressPct = Math.round((JourneyState.currentCoordsIndex / (coordinates.length - 1)) * 100);
        const pctRemaining = (coordinates.length - 1 - JourneyState.currentCoordsIndex) / (coordinates.length - 1);
        const remDurationSec = Math.round(route.duration * pctRemaining);
        const remDurationFormatted = formatDuration(remDurationSec);

        let remDist = 0;
        for (let idx = JourneyState.currentCoordsIndex; idx < coordinates.length - 1; idx++) {
            remDist += getDistance(coordinates[idx], coordinates[idx + 1]);
        }
        const remDistFormatted = remDist >= 1000 ? `${(remDist / 1000).toFixed(1)} km` : `${Math.round(remDist)} m`;

        if (onProgress) {
            onProgress(progressPct, remDurationFormatted, remDistFormatted);
        }

        // Active checks for proximity alerts
        if (safetyData) {
          this.checkProximityMilestones(nextCoords, safetyData, onAlert);
        }

    }, stepDuration);
  },

  stop() {
    if (JourneyState.trackingInterval) {
        clearInterval(JourneyState.trackingInterval);
        JourneyState.trackingInterval = null;
    }

    if (MapState.mapInstance && JourneyState.simulatedUserMarker) {
        MapState.mapInstance.removeLayer(JourneyState.simulatedUserMarker);
        JourneyState.simulatedUserMarker = null;
    }

    JourneyState.activeJourneyRoute = null;
    JourneyState.currentCoordsIndex = 0;
    localStorage.removeItem('safepath_active_journey');
  },

  checkProximityMilestones(coords, safetyData, onAlert) {
    if (!onAlert) return;
    const { police = [], lighting = [], transit = [] } = safetyData;

    police.forEach(station => {
        const dist = getDistance(coords, station.coords);
        if (dist < 100 && !station.triggered) {
            station.triggered = true;
            onAlert(`Entering high security area: close to ${station.name}.`, 'safe');
            setTimeout(() => { station.triggered = false; }, 60000);
        }
    });

    lighting.forEach(pt => {
        const dist = getDistance(coords, pt.coords);
        if (dist < 80 && !pt.triggered) {
            pt.triggered = true;
            onAlert(`Passing under well-lit street: ${pt.name}.`, 'info');
            setTimeout(() => { pt.triggered = false; }, 40000);
        }
    });

    transit.forEach(hub => {
        const dist = getDistance(coords, hub.coords);
        if (dist < 80 && !hub.triggered) {
            hub.triggered = true;
            onAlert(`Passing busy transit hub: ${hub.name}. Bystanders present.`, 'info');
            setTimeout(() => { hub.triggered = false; }, 45000);
        }
    });
  }
};
export { formatDuration };
