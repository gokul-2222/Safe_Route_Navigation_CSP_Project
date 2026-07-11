// SafePath Map Management Module
import { 
    DEFAULT_CENTER, 
    policeStations, 
    wellLitPoints, 
    transitHubs, 
    crowdDensityZones, 
    highRiskZones 
} from './mockData.js';

let map;
let sourceMarker = null;
let destMarker = null;
let tileLayer = null;

// Layer Groups
let policeLayer;
let lightingLayer;
let crowdLayer;
let highRiskLayer;
export let routeLayer; // Layer containing routes drawn on map

export function initMap(onMapClickCallback) {
    if (map) return map;

    // 1. Initialize map container
    map = L.map('map', {
        zoomControl: false // Custom placement later
    }).setView(DEFAULT_CENTER, 14);

    // 2. Add Dark Mode tile layer (CartoDB Dark Matter)
    tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // 3. Add custom Zoom control at the bottom right
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    // 4. Initialize Layer Groups
    policeLayer = L.layerGroup().addTo(map);
    lightingLayer = L.layerGroup().addTo(map);
    crowdLayer = L.layerGroup().addTo(map);
    highRiskLayer = L.layerGroup().addTo(map);
    routeLayer = L.layerGroup().addTo(map);

    // 5. Populate layers with mock data
    populateSafetyLayers();

    // 6. Set up map click handler
    map.on('click', (e) => {
        if (onMapClickCallback) {
            onMapClickCallback(e.latlng);
        }
    });

    return map;
}

// Recenter Map
export function recenterMap(coords = DEFAULT_CENTER, zoom = 14) {
    if (map) {
        map.setView(coords, zoom);
    }
}

// Get Map Instance
export function getMap() {
    return map;
}

// Populate Layer Groups
function populateSafetyLayers() {
    // A. Police Stations
    policeStations.forEach(station => {
        const icon = L.divIcon({
            className: 'safety-marker',
            html: `<div class="marker-inner marker-police" title="${station.name}"><i class="fa-solid fa-building-shield"></i></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
        
        L.marker(station.coords, { icon })
            .bindPopup(`<strong>${station.name}</strong><br>${station.description}`)
            .addTo(policeLayer);
    });

    // B. Well-Lit Points
    wellLitPoints.forEach(pt => {
        const icon = L.divIcon({
            className: 'safety-marker',
            html: `<div class="marker-inner marker-light" title="${pt.name}"><i class="fa-solid fa-lightbulb"></i></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        L.marker(pt.coords, { icon })
            .bindPopup(`<strong>${pt.name}</strong><br>${pt.description}`)
            .addTo(lightingLayer);
    });

    // C. Public Transit
    transitHubs.forEach(hub => {
        const icon = L.divIcon({
            className: 'safety-marker',
            html: `<div class="marker-inner marker-transit" title="${hub.name}"><i class="fa-solid fa-bus"></i></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        L.marker(hub.coords, { icon })
            .bindPopup(`<strong>${hub.name}</strong><br>Lines: ${hub.line}`)
            .addTo(lightingLayer); // Bundled under well-lit corridors/transit layer
    });

    // D. Crowd Density Zones
    crowdDensityZones.forEach(zone => {
        let color = '#f59e0b'; // Amber for standard medium
        if (zone.density === 'High') color = '#eab308';
        if (zone.density === 'Low') color = '#a855f7'; // Purple for isolated
        
        L.circle(zone.coords, {
            radius: zone.radius,
            color: color,
            fillColor: color,
            fillOpacity: 0.12,
            weight: 1.5,
            dashArray: '3, 5'
        })
        .bindPopup(`<strong>${zone.name}</strong><br>Crowd Density: ${zone.density}<br>${zone.description}`)
        .addTo(crowdLayer);
    });

    // E. High-Risk Zones
    highRiskZones.forEach(zone => {
        L.circle(zone.coords, {
            radius: zone.radius,
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.25,
            weight: 2,
            dashArray: '5, 5'
        })
        .bindPopup(`<strong>${zone.name}</strong><br>Status: ${zone.riskLevel} Risk<br>${zone.description}`)
        .addTo(highRiskLayer);
    });
}

// Set Source Marker
export function setSourceMarker(latlng, label = "Start Point") {
    if (sourceMarker) {
        map.removeLayer(sourceMarker);
    }
    
    const icon = L.divIcon({
        className: 'safety-marker',
        html: `<div class="marker-inner" style="background-color: var(--color-primary); border-color: white;"><i class="fa-solid fa-location-dot"></i></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });

    sourceMarker = L.marker(latlng, { icon, draggable: true })
        .addTo(map)
        .bindPopup(`<strong>Starting Point</strong><br>${label}`);

    sourceMarker.on('dragend', function() {
        const newLatLng = sourceMarker.getLatLng();
        triggerMarkerMovedEvent('source', newLatLng);
    });

    return sourceMarker;
}

// Set Destination Marker
export function setDestinationMarker(latlng, label = "Destination") {
    if (destMarker) {
        map.removeLayer(destMarker);
    }

    const icon = L.divIcon({
        className: 'safety-marker',
        html: `<div class="marker-inner" style="background-color: var(--color-danger); border-color: white;"><i class="fa-solid fa-flag-checkered"></i></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });

    destMarker = L.marker(latlng, { icon, draggable: true })
        .addTo(map)
        .bindPopup(`<strong>Destination</strong><br>${label}`);

    destMarker.on('dragend', function() {
        const newLatLng = destMarker.getLatLng();
        triggerMarkerMovedEvent('dest', newLatLng);
    });

    return destMarker;
}

// Trigger marker moved callbacks in main app
let markerMoveCallback = null;
export function registerMarkerMovedCallback(cb) {
    markerMoveCallback = cb;
}

function triggerMarkerMovedEvent(type, latlng) {
    if (markerMoveCallback) {
        markerMoveCallback(type, latlng);
    }
}

// Clear Search Markers
export function clearSearchMarkers() {
    if (sourceMarker) {
        map.removeLayer(sourceMarker);
        sourceMarker = null;
    }
    if (destMarker) {
        map.removeLayer(destMarker);
        destMarker = null;
    }
}

// Toggle Visibility of Safety Layers
export function toggleLayer(layerName, visible) {
    if (layerName === 'heatmap') {
        if (visible) map.addLayer(crowdLayer);
        else map.removeLayer(crowdLayer);
    } else if (layerName === 'lighting') {
        if (visible) map.addLayer(lightingLayer);
        else map.removeLayer(lightingLayer);
    } else if (layerName === 'police') {
        if (visible) map.addLayer(policeLayer);
        else map.removeLayer(policeLayer);
    }
}

// Repopulate safety resource layers dynamically
export function repopulateSafetyLayers() {
    if (!policeLayer || !lightingLayer || !crowdLayer || !highRiskLayer) return;
    
    // Clear current markers from map layers
    policeLayer.clearLayers();
    lightingLayer.clearLayers();
    crowdLayer.clearLayers();
    highRiskLayer.clearLayers();

    // Re-draw anchors
    populateSafetyLayers();
}

// Switch between Dark Matter style and Google Maps Style
export function setMapTileStyle(styleName) {
    if (!tileLayer) return;

    if (styleName === 'google') {
        // Public Google Maps Street View XYZ tile source
        tileLayer.setUrl('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}');
        tileLayer.options.attribution = 'Map data &copy; Google';
    } else {
        // Default CartoDB Dark Matter
        tileLayer.setUrl('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');
        tileLayer.options.attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
    }
}
