import { RouteState, MapState } from '../state/State.js';
import { RoutingService } from '../services/RoutingService.js';
import { LayerManager } from '../map/LayerManager.js';
import { RouteRenderer } from './RouteRenderer.js';

export const RouteController = {
  async findRoutes(source, destination, onRouteSelected) {
    if (!source || !destination) {
      throw new Error("Set both start and destination points.");
    }

    const routes = await RoutingService.getRoutes(source, destination);
    RouteState.routes = routes;

    // Get safety assets dynamically from backend for safest path coordinates
    const safetyData = await RoutingService.getSafetyZones(routes[0].coordinates);
    
    // Cache safety data for runtime reference
    RouteState.activeSafetyData = safetyData;
    LayerManager.populateSafetyLayers(safetyData);

    // Auto-select safest path
    const defaultSelectedId = routes[0].id;
    RouteState.selectedRouteId = defaultSelectedId;

    // Draw on map
    RouteRenderer.drawRoutes(routes, defaultSelectedId, onRouteSelected);

    // Adjust map zoom boundaries
    const bounds = L.latLngBounds([source, destination]);
    MapState.mapInstance.fitBounds(bounds, { padding: [50, 50] });

    return routes;
  },

  selectRoute(routeId, onRouteSelected) {
    RouteState.selectedRouteId = routeId;
    RouteRenderer.drawRoutes(RouteState.routes, routeId, onRouteSelected);
    return RouteState.routes.find(r => r.id === routeId);
  },

  reset() {
    RouteState.routes = [];
    RouteState.selectedRouteId = null;
    RouteState.activeSafetyData = null;
    RouteRenderer.clearRoutes();
  }
};
