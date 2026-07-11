# SafeRoute Navigator - Frontend Architecture Document

The frontend is a modular modern client using ES6 modules. It uses Vite for asset bundling, and Leaflet for maps rendering.

## 1. Project Organization
```
frontend/
├── index.html                 (Main UI frame)
└── src/
    ├── main.js                (Bootstrapping orchestration layer)
    ├── config/
    │   └── constants.js       (Static helpline constants)
    ├── state/
    │   └── State.js           (Segmented reactive variables)
    ├── services/
    │   ├── LocationService.js (GPS query endpoints)
    │   ├── GeocodingService.js(Nominatim proxy)
    │   ├── RoutingService.js  (Route queries proxy)
    │   └── ShareService.js    (Journey sharing proxy)
    ├── map/
    │   ├── MapManager.js      (Leaflet initializer)
    │   ├── MarkerManager.js   (Pins, draggable markers)
    │   └── LayerManager.js    (Heatmaps and police icons)
    ├── routing/
    │   ├── RouteController.js (Orchestrator)
    │   └── RouteRenderer.js   (Draws SVG polylines)
    ├── tracking/
    │   └── JourneyController.js(Stepping progress, distance timers)
    ├── sos/
    │   └── SOSController.js   (Web Audio synthesizer)
    ├── components/
    │   ├── ToastComponent.js  (Flash feedback message banners)
    │   ├── RouteCardComponent.js(Route detail items list)
    │   ├── ContactComponent.js(Settings phone profiles)
    │   └── HistoryComponent.js(SOS alert timeline logs)
    ├── i18n/
    │   └── i18n.js            (Multi-lingual translation mappings)
    └── styles/
        └── style.css          (Verbatim layouts and styles)
```

## 2. Communications Between Modules
- **State Segregation**: All modules retrieve and update state fields inside `/src/state/State.js` directly, reducing direct data bindings.
- **Event-Driven Layout**: Controllers and components register callbacks to receive notifications (e.g. `MarkerManager` notifies `main.js` when markers are dragged, which updates geocode addresses).
- **Service Segregation**: Components and managers never make direct REST fetches; they query specific Service wrappers in `/services/` which hit backend ports.
