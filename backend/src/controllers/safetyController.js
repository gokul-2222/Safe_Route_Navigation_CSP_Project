import { getSafetyDataForRoute } from '../services/routingService.js';

export async function getSafetyZones(req, res, next) {
  try {
    const { coordinates } = req.body;
    
    if (!Array.isArray(coordinates)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid coordinates format. Expecting an array of [lat, lng] points'
      });
    }

    const safetyData = getSafetyDataForRoute(coordinates);
    res.json({ status: 'success', data: safetyData });
  } catch (error) {
    next(error);
  }
}
