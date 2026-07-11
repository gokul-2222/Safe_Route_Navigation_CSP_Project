import { MapState } from '../state/State.js';
import { DEFAULT_CENTER } from '../config/constants.js';

export const MapManager = {
  init(onClickCallback) {
    if (MapState.mapInstance) return MapState.mapInstance;

    // 1. Initialize map container
    MapState.mapInstance = L.map('map', {
        zoomControl: false
    }).setView(DEFAULT_CENTER, 14);

    // 2. Add Dark Mode tile layer (CartoDB Dark Matter)
    MapState.tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(MapState.mapInstance);

    // 3. Add custom Zoom control at the bottom right
    L.control.zoom({
        position: 'bottomright'
    }).addTo(MapState.mapInstance);

    // 4. Initialize Layer Groups
    MapState.policeLayer = L.layerGroup().addTo(MapState.mapInstance);
    MapState.lightingLayer = L.layerGroup().addTo(MapState.mapInstance);
    MapState.crowdLayer = L.layerGroup().addTo(MapState.mapInstance);
    MapState.highRiskLayer = L.layerGroup().addTo(MapState.mapInstance);
    MapState.routeLayer = L.layerGroup().addTo(MapState.mapInstance);

    // 5. Set up map click handler
    MapState.mapInstance.on('click', (e) => {
        if (onClickCallback) {
            onClickCallback(e.latlng);
        }
    });

    return MapState.mapInstance;
  },

  recenter(coords = DEFAULT_CENTER, zoom = 14) {
    if (MapState.mapInstance) {
      MapState.mapInstance.setView(coords, zoom);
    }
  },

  setTileStyle(styleName) {
    if (!MapState.tileLayer) return;
    MapState.activeTileStyle = styleName;

    if (styleName === 'google') {
        MapState.tileLayer.setUrl('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}');
        MapState.tileLayer.options.attribution = 'Map data &copy; Google';
    } else {
        MapState.tileLayer.setUrl('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');
        MapState.tileLayer.options.attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
    }
  }
};
