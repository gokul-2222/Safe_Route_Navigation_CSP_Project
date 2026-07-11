# SafeRoute Navigator - Architectural Design Document

## 1. Project Overview
SafeRoute Navigator is a safety-oriented navigation and SOS beacon application. It allows users to compute walking paths, analyzes those paths against a database of street illumination, crime risk, crowd numbers, and police patrols to score routes, and offers active emergency siren signaling, location updates tracking, and live journey sharing options.

## 2. Refactoring Goals
- **Separation of Concerns**: Uncouple UI bindings, business safety logic, API proxy fetch requests, Leaflet map rendering, state records, and media audio synthesis.
- **Production Readiness**: Set up a Node.js Express server to handle API proxying (OSRM routing and Nominatim geocoding) securely, and host frontend client builds efficiently.
- **State Segregation**: Separate the singular global state object into isolated controllers (`AppState`, `MapState`, `RouteState`, `JourneyState`, `SOSState`).

## 3. Architecture Diagrams
```
+--------------------------------------------------------------+
|                     Leaflet Client UI                        |
|   (main.js, Toast, RouteCard, Contact, History Components)   |
+------------------------------+-------------------------------+
                               |
                   Fetch API / REST requests
                               |
                               v
+------------------------------+-------------------------------+
|                    Node.js Express Server                    |
|   (Proxy search query, reverse geocode, OSRM endpoints)      |
+------------------------------+-------------------------------+
                               |
                     Third Party Requests
                               |
                               v
               +---------------+---------------+
               |  OSRM API  |  Nominatim API   |
               +------------+------------------+
```

## 4. Frontend Architecture & State Flow
1. **State Modules**:
   - `AppState`: UI language preferences and sidebar toggles.
   - `MapState`: Active Leaflet instance, pointers, coordinates, custom overlays.
   - `RouteState`: Array of routes returned from OSRM, currently highlighted route.
   - `JourneyState`: Journey simulation interval tracking, stepping position indicators.
   - `SOSState`: Alarm wailing intervals, synthesized web audio oscillators.

2. **Manager Modules**:
   - `MapManager`: Sets up Leaflet container and configures base tiles.
   - `MarkerManager`: Handles draggable source, destination, and live walkers pins.
   - `LayerManager`: Handles drawing crowd circles, well-lit corridors, and police station logos.

3. **Event Loop Flows**:
   - *Map Clicks* -> Detect LatLng -> Request address via Geocode service -> Update corresponding start/end inputs.
   - *Start Journey* -> Register sharing route with backend -> Start step increment interval -> Perform distance calculations and proximity checks -> Emit alerts to UI feed.

## 5. Backend Service Layout
- **Routing Service**: Queries OSRM foot engine. Fallbacks to straight-line curves if external service is down.
- **Geocoding Service**: Wraps Nominatim queries. Requires user-agent headers.
- **Safety Service**: Stores safety database. Spawns coordinates fixtures dynamically and scores routes out of 100 based on women's safety priority constraints.
- **Sharing Service**: Holds a memory map cache of shared spectator trip IDs.
