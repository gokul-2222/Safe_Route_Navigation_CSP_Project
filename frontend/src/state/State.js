export const AppState = {
  currentLanguage: 'en',
  isSidebarCollapsed: false,
  activeTab: 'routes-tab'
};

export const MapState = {
  mapInstance: null,
  tileLayer: null,
  sourceCoords: null,
  sourceAddress: "",
  destCoords: null,
  destAddress: "",
  mapPickTarget: null, // 'source' or 'dest'
  currentLocation: [16.5062, 80.6480], // default Vijayawada
  activeTileStyle: 'dark', // 'dark' or 'google'
  layers: {
    heatmap: true,
    lighting: true,
    police: true
  },
  // Leaflet layer groups
  policeLayer: null,
  lightingLayer: null,
  crowdLayer: null,
  highRiskLayer: null,
  routeLayer: null,
  // Markers
  sourceMarker: null,
  destMarker: null
};

export const RouteState = {
  routes: [],
  selectedRouteId: null,
  activeSafetyData: null
};

export const JourneyState = {
  activeJourneyRoute: null,
  currentCoordsIndex: 0,
  trackingInterval: null,
  simulatedUserMarker: null
};

export const SOSState = {
  isSirenMuted: false,
  countdownInterval: null,
  audioCtx: null,
  oscillator: null,
  gainNode: null,
  sirenInterval: null
};
