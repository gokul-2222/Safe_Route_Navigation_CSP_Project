# SafeRoute Navigator - Technology Stack Matrix

This document summarizes the technology choices, advantages, and alternative paths.

| Category | Technology | Rationale / Advantages | Limitations | Alternatives |
|---|---|---|---|---|
| **Map Rendering** | **Leaflet** | Lightweight, open-source, highly responsive DOM-based vector layers. | Harder to scale with 3D buildings visualization. | Mapbox GL JS, Google Maps SDK |
| **Map Base Data** | **OpenStreetMap** | Completely free, open API, crowdsourced location updates. | Metadata is sometimes missing in rural regions. | Google Maps Premium, HERE Maps |
| **Routing Engine** | **OSRM (Project OSRM)** | Extremely fast path query execution, customizable walking profile steps. | Alternative routes are sometimes limited. | Valhalla, GraphHopper |
| **Geocoding** | **Nominatim** | Open source geocoder search, parses structured text addresses. | Stricter query rate limiting (1 req/sec). | Google Geocoding, Mapbox Search |
| **Siren Synthesis** | **Web Audio API** | Generates alarms directly using wave oscillators without downloading audio files. | Requires user interaction first due to browser security. | MP3 audio files downloads |
| **Server Framework** | **Node.js + Express**| Fast asynchronous performance, simple REST route mapping. | Single-threaded main loop. | Python FastAPI, Go Fiber |
| **Build System** | **Vite** | Rapid ESM hot module replacement (HMR), lightweight build outputs. | Slightly different behaviors in production bundle versus local dev. | Webpack, Parcel |
