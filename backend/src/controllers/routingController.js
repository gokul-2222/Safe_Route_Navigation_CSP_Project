import * as routingService from '../services/routingService.js';

export async function getRoutes(req, res, next) {
  try {
    const { source, destination } = req.body;
    
    if (!source || !destination) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required body parameters: source, destination'
      });
    }

    if (!Array.isArray(source) || source.length !== 2 || !Array.isArray(destination) || destination.length !== 2) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid source or destination coordinate format. Expecting [lat, lng]'
      });
    }

    const sLat = parseFloat(source[0]);
    const sLng = parseFloat(source[1]);
    const dLat = parseFloat(destination[0]);
    const dLng = parseFloat(destination[1]);

    if (isNaN(sLat) || isNaN(sLng) || isNaN(dLat) || isNaN(dLng)) {
      return res.status(400).json({
        status: 'error',
        message: 'Coordinates must be valid numbers'
      });
    }

    const routes = await routingService.calculateRoutes(source, destination);
    res.json({ status: 'success', data: routes });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message
      });
    }
    next(error);
  }
}
