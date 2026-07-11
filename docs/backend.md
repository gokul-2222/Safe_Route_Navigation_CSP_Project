# SafeRoute Navigator - Backend Architecture Document

The backend is built with Node.js and Express. It proxies geocoding and routing APIs, handles safety analysis, and keeps journey sharing details cached.

## 1. Project Organization
```
backend/
├── package.json               (Backend dependencies)
├── .env                       (Environment configurations)
└── src/
    ├── server.js              (Express initializer and main pipeline mounts)
    ├── config/
    │   └── config.js          (Dotenv variables config)
    ├── middleware/
    │   ├── errorHandler.js    (Custom status logger and JSON wrapper)
    │   └── validator.js       (Param query and body validation checker)
    ├── routes/
    │   └── api.js             (API endpoints routing maps)
    ├── controllers/
    │   ├── geocodeController.js (Nominatim handlers)
    │   ├── routingController.js (OSRM handlers)
    │   ├── safetyController.js  (Safety assets layers)
    │   └── sharingController.js (Shared trip cache logs)
    ├── services/
    │   ├── geocodeService.js  (Fetch requests Nominatim)
    │   ├── routingService.js  (Calculations, fallbacks)
    │   ├── safetyService.js   (Safety metrics, scoring calculations)
    │   └── sharingService.js  (Active spectator memory store)
    └── utils/
        └── logger.js          (Standard console wrappers)
```

## 2. Future Scale Out / MongoDB Integration
- **Database support**: To replace the memory map store in `sharingService.js` and `SOSController` logs, standard MongoDB schemas can be added under a `models/` directory using Mongoose.
- **Authentication**: JWT validation middleware can be registered in `routes/api.js` for custom user settings accounts.
- **WebSocket Alerts**: Real-time push messages for emergency SOS triggers can be bound in `server.js` using Socket.io, notifying active contacts instantly when a user presses the SOS button.
