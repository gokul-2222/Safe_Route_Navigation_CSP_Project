# SafeRoute Navigator - Installation and Deployment Manual

This guide describes how to install dependencies, run development servers, and prepare production builds.

## 1. Prerequisites
- **Node.js**: Version 18 or higher is required.
- **npm**: Standard Package Manager.

## 2. Installation Details
1. Clone the project files.
2. Run installation scripts from the project root:
   ```bash
   npm run install:all
   ```
   This triggers npm installations inside the `frontend/` and `backend/` directories.

## 3. Configuration Setup
Create a `.env` file in the `backend/` directory referencing `.env.example`:
```ini
PORT=5000
NODE_ENV=development
OSRM_BASE_URL=https://router.projectosrm.org
NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
```

## 4. Running Development Servers
You can launch development environments using concurrent processes from the project root:
- Run backend API server (runs on `http://localhost:5000`):
  ```bash
  npm run dev:backend
  ```
- Run Vite frontend dev server (runs on `http://localhost:5173`):
  ```bash
  npm run dev:frontend
  ```

Vite proxies `/api/v1/*` requests directly to backend port 5000 automatically in development mode.

## 5. Production Compilation
To build and deploy in a production environment:
1. Build frontend assets:
   ```bash
   cd frontend
   npm run build
   ```
   This compiles assets into `frontend/dist/`.
2. Update Express server static route configuration in `backend/src/server.js` to point to `frontend/dist`.
3. Start the production backend server:
   ```bash
   cd ../backend
   npm start
   ```
   Now the single Express app serves frontend assets and coordinates API calls concurrently.
