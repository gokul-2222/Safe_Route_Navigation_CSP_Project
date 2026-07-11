import { MapState } from '../state/State.js';

export const LayerManager = {
  toggleLayer(layerName, visible) {
    if (!MapState.mapInstance) return;
    MapState.layers[layerName] = visible;

    if (layerName === 'heatmap') {
        if (visible) MapState.mapInstance.addLayer(MapState.crowdLayer);
        else MapState.mapInstance.removeLayer(MapState.crowdLayer);
    } else if (layerName === 'lighting') {
        if (visible) MapState.mapInstance.addLayer(MapState.lightingLayer);
        else MapState.mapInstance.removeLayer(MapState.lightingLayer);
    } else if (layerName === 'police') {
        if (visible) MapState.mapInstance.addLayer(MapState.policeLayer);
        else MapState.mapInstance.removeLayer(MapState.policeLayer);
    }
  },

  populateSafetyLayers(safetyData) {
    if (!MapState.policeLayer || !MapState.lightingLayer || !MapState.crowdLayer || !MapState.highRiskLayer) return;

    // Clear current markers
    MapState.policeLayer.clearLayers();
    MapState.lightingLayer.clearLayers();
    MapState.crowdLayer.clearLayers();
    MapState.highRiskLayer.clearLayers();

    const { police = [], lighting = [], transit = [], crowd = [], risk = [] } = safetyData;

    // A. Police Stations
    police.forEach(station => {
        const icon = L.divIcon({
            className: 'safety-marker',
            html: `<div class="marker-inner marker-police" title="${station.name}"><i class="fa-solid fa-building-shield"></i></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
        
        L.marker(station.coords, { icon })
            .bindPopup(`<strong>${station.name}</strong><br>${station.description}`)
            .addTo(MapState.policeLayer);
    });

    // B. Well-Lit Points
    lighting.forEach(pt => {
        const icon = L.divIcon({
            className: 'safety-marker',
            html: `<div class="marker-inner marker-light" title="${pt.name}"><i class="fa-solid fa-lightbulb"></i></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        L.marker(pt.coords, { icon })
            .bindPopup(`<strong>${pt.name}</strong><br>${pt.description}`)
            .addTo(MapState.lightingLayer);
    });

    // C. Public Transit
    transit.forEach(hub => {
        const icon = L.divIcon({
            className: 'safety-marker',
            html: `<div class="marker-inner marker-transit" title="${hub.name}"><i class="fa-solid fa-bus"></i></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        L.marker(hub.coords, { icon })
            .bindPopup(`<strong>${hub.name}</strong><br>Lines: ${hub.line}`)
            .addTo(MapState.lightingLayer); // Bundled under lighting layer
    });

    // D. Crowd Density Zones
    crowd.forEach(zone => {
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
        .addTo(MapState.crowdLayer);
    });

    // E. High-Risk Zones
    risk.forEach(zone => {
        L.circle(zone.coords, {
            radius: zone.radius,
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.25,
            weight: 2,
            dashArray: '5, 5'
        })
        .bindPopup(`<strong>${zone.name}</strong><br>Status: ${zone.riskLevel} Risk<br>${zone.description}`)
        .addTo(MapState.highRiskLayer);
    });
  }
};
