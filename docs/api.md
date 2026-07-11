# SafeRoute Navigator - API Specification

All backend endpoints are prefixed with `/api/v1`.

---

## 1. Geocoding Autocomplete Proxy
**Endpoint**: `GET /api/v1/geocode/search`

- **Query Parameters**:
  - `q` (string, required): Query string (minimum 3 characters)
- **Response Example**:
  ```json
  {
    "status": "success",
    "data": [
      {
        "lat": "16.5185",
        "lon": "80.6210",
        "display_name": "Vijayawada Junction Railway Station, AP, India"
      }
    ]
  }
  ```

---

## 2. Reverse Geocoding Proxy
**Endpoint**: `GET /api/v1/geocode/reverse`

- **Query Parameters**:
  - `lat` (number, required): Latitude
  - `lon` (number, required): Longitude
- **Response Example**:
  ```json
  {
    "status": "success",
    "data": {
      "display_name": "Benz Circle, Vijayawada, AP, India"
    }
  }
  ```

---

## 3. Route Calculation & Safety Analysis
**Endpoint**: `POST /api/v1/routes`

- **Request Body**:
  ```json
  {
    "source": [16.5185, 80.6210],
    "destination": [16.5062, 80.6635]
  }
  ```
- **Response Example**:
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "route-0",
        "name": "Safest Route",
        "distance": 4500,
        "duration": 3600,
        "coordinates": [[16.5185, 80.6210], [16.5120, 80.6380], [16.5062, 80.6635]],
        "safetyScore": 92,
        "breakdown": {
          "lighting": 90,
          "police": 85,
          "crowd": 88,
          "transit": 80,
          "traffic": 70
        }
      }
    ]
  }
  ```

---

## 4. Retrieve Route Safety Resources
**Endpoint**: `POST /api/v1/safety/zones`

- **Request Body**:
  ```json
  {
    "coordinates": [[16.5185, 80.6210], [16.5120, 80.6380]]
  }
  ```
- **Response Example**:
  ```json
  {
    "status": "success",
    "data": {
      "police": [
        { "id": "v_p1", "name": "Suryaraopet Police Station", "coords": [16.5115, 80.6385] }
      ],
      "lighting": [],
      "transit": [],
      "crowd": [],
      "risk": []
    }
  }
  ```

---

## 5. Journey Link Register Sharing
**Endpoint**: `POST /api/v1/journeys/share`

- **Request Body**:
  ```json
  {
    "routeId": "route-0",
    "routes": [ ... ]
  }
  ```
- **Response Example**:
  ```json
  {
    "status": "success",
    "data": {
      "id": "TRK-A8B9CD",
      "url": "/spectator?tripId=TRK-A8B9CD&routeId=route-0"
    }
  }
  ```

---

## 6. Retrieve Journey Track Spectator
**Endpoint**: `GET /api/v1/journeys/:id`

- **Response Example**:
  ```json
  {
    "status": "success",
    "data": {
      "id": "TRK-A8B9CD",
      "routeId": "route-0",
      "routes": [ ... ]
    }
  }
  ```
