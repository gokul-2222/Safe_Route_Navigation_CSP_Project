import { MapState } from '../state/State.js';

export const RouteRenderer = {
  drawRoutes(routes, selectedRouteId, onRouteSelectCallback) {
    if (!MapState.routeLayer) return;
    MapState.routeLayer.clearLayers();

    routes.forEach(route => {
        const isSelected = route.id === selectedRouteId;
        
        const weight = isSelected ? 6 : 4;
        const opacity = isSelected ? 0.9 : 0.45;
        const color = isSelected ? route.color : "#64748b";

        const polyline = L.polyline(route.coordinates, {
            color: color,
            weight: weight,
            opacity: opacity,
            lineJoin: 'round'
        }).addTo(MapState.routeLayer);

        polyline.on('click', () => {
            if (onRouteSelectCallback) {
              onRouteSelectCallback(route.id);
            }
        });

        if (isSelected) {
            polyline.bringToFront();
        }
    });
  },

  clearRoutes() {
    if (MapState.routeLayer) {
      MapState.routeLayer.clearLayers();
    }
  }
};
