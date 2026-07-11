# SafeRoute Navigator - Personal Safety Routing & SOS Center

SafeRoute Navigator is a web application designed to empower users with safety-oriented walking route plans, emergency sirens sound effects, active GPS beacon sharing, and emergency contacts configurations.

## Key Features
- **Draggable Route Points**: Drag source and destination markers dynamically, updating matching geocode addresses instantly.
- **Safety Scores Breakdown**: Ranks routes out of 100 based on street lighting intensity, transit access, crowd levels, and crime records.
- **Synthesized Audio Alarm**: Web Audio API oscillator synthesis generating dual-tone wailing sirens.
- **Live Location Sharing**: Registers journeys and copies spectator sharing URLs.
- **Local Settings Database**: Configures personalized emergency SMS phone profiles.
- **Multi-Lingual i18n support**: Seamless transitions between English, Hindi, Tamil, Telugu, and Kannada.

## Refactored Production Architecture
The project has been refactored to segregate concerns cleanly:
- `backend/`: Node.js & Express REST API server providing proxies for Nominatim search/reverse geocoding and OSRM walking calculations, running safety evaluations, and caching shared spectator trips.
- `frontend/`: Modular frontend client using Vite, separating Leaflet rendering, marker handling, custom state modules (`AppState`, `MapState`, `RouteState`, `JourneyState`, `SOSState`), and independent UI components.

## Technical Structure
```
SF/
├── frontend/                  (Vite + ESM client UI application)
├── backend/                   (Node.js + Express API proxies application)
├── docs/                      (Architecture, routing, API specification)
├── package.json               (Root monorepo workspace runner)
└── README.md                  (Project summary document)
```

## Quick Start
1. Install dependencies inside root workspace:
   ```bash
   npm run install:all
   ```
2. Start development servers concurrently:
   - Backend: `npm run dev:backend` (Runs on port 5000)
   - Frontend: `npm run dev:frontend` (Runs on port 5173 with backend proxies)

## Project Documentation
Detailed specifications are stored under the `docs/` folder:
- [Architecture Design](docs/architecture.md)
- [API Spec Specifications](docs/api.md)
- [Routing and Safety Engine](docs/routing-flow.md)
- [Frontend Components Layout](docs/frontend.md)
- [Backend Services Layout](docs/backend.md)
- [Tech Stack Selection Matrix](docs/tech-stack.md)
- [Deployment Manual](docs/deployment.md)
