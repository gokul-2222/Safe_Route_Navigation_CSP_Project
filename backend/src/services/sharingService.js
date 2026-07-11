import { logger } from '../utils/logger.js';

// In-memory storage for active shared trips
const activeTrips = new Map();

export function registerSharedJourney(routeId, routes) {
  const tripId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const id = `TRK-${tripId}`;
  
  logger.info(`Registering shared journey trip: ${id} for route ID: ${routeId}`);
  
  activeTrips.set(id, {
    id,
    routeId,
    routes,
    createdAt: new Date().toISOString()
  });

  return id;
}

export function getSharedJourney(id) {
  logger.info(`Retrieving shared journey trip: ${id}`);
  return activeTrips.get(id);
}
