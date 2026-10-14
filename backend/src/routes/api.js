import { Router } from 'express';
import * as geocodeController from '../controllers/geocodeController.js';
import * as routingController from '../controllers/routingController.js';
import * as safetyController from '../controllers/safetyController.js';
import * as sharingController from '../controllers/sharingController.js';
import * as chatController from '../controllers/chatController.js';
import { validateQueryParams, validateBodyParams } from '../middleware/validator.js';

const router = Router();

// Geocoding Proxy Routes
router.get('/geocode/search', validateQueryParams(['q']), geocodeController.search);
router.get('/geocode/reverse', validateQueryParams(['lat', 'lon']), geocodeController.reverse);

// Route Calculations Proxy Route
router.post('/routes', validateBodyParams(['source', 'destination']), routingController.getRoutes);

// Safety Zones Resource Query
router.post('/safety/zones', validateBodyParams(['coordinates']), safetyController.getSafetyZones);

// Live Journey Sharing Routes
router.post('/journeys/share', validateBodyParams(['routeId', 'routes']), sharingController.share);
router.get('/journeys/:id', sharingController.getJourney);

// Safety Assistant Chat Route
router.post('/chat', validateBodyParams(['message']), chatController.sendMessage);

export default router;
