# SafeRoute Navigator - Routing & Safety Scoring Workflow

This document explains the route calculation engine, safety analysis metrics, and rendering workflow.

## 1. Safety Evaluation Metrics
SafeRoute scores routes out of 100 based on five weighted parameters tailored to personal safety:
1. **Street Lighting (35% weight)**: Priority parameter. Routes near designated illumination nodes score higher.
2. **Crowd Density (25% weight)**: Encourages "eyes on the street" security. Busy commercial areas raise the score, while isolated back alleys apply penalties.
3. **Police Patrols (20% weight)**: proximity to police command kiosks or sub-stations.
4. **Public Transit (10% weight)**: Accessibility to exit options (bus stops, railway stations).
5. **Traffic Conditions (10% weight)**: Moderate vehicular flow ensures populated streets.

## 2. Calculation Flow

```
User Pins Source & Destination
             │
             ▼
Frontend triggers RouteController.findRoutes()
             │
             ▼
POST API request to backend `/api/v1/routes`
             │
             ▼
Backend routingService queries OSRM for walking routes
             │
             ▼
Backend safetyService samples coordinate points (every ~15th step)
             │
             ▼
Calculates proximity distance loops against safety zones database
             │
             ▼
Computes final score & subtracts blind spot/high-risk penalties
             │
             ▼
Sorts and designates routes: Safest, Fastest, or Alternative
             │
             ▼
Returns JSON response to frontend client
             │
             ▼
LayerManager draws safety layers and RouteRenderer draws paths
```

## 3. Offline Backup Safety Calculations
If OSRM is unreachable, the backend switches to offline calculation mode:
- **Fastest Route**: Connects source and destination in a straight-line vector.
- **Safest Route**: Shifts coordinates outward to form an offset curve passing near simulated high-safety corridors.
- **Alternative Route**: Offsets coordinates in the opposite direction.
- Evaluates safety score breakdown using a deterministic hash based on coordinates to keep inputs stable.
