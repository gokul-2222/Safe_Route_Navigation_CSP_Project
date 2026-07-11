import * as sharingService from '../services/sharingService.js';

export function share(req, res, next) {
  try {
    const { routeId, routes } = req.body;
    if (!routeId || !routes) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing routeId or routes parameters'
      });
    }
    const tripId = sharingService.registerSharedJourney(routeId, routes);
    res.json({
      status: 'success',
      data: {
        id: tripId,
        url: `/spectator?tripId=${tripId}&routeId=${routeId}` // We will handle this in client routing
      }
    });
  } catch (error) {
    next(error);
  }
}

export function getJourney(req, res, next) {
  try {
    const { id } = req.params;
    const journey = sharingService.getSharedJourney(id);
    if (!journey) {
      return res.status(404).json({
        status: 'error',
        message: `Journey with ID ${id} not found`
      });
    }
    res.json({ status: 'success', data: journey });
  } catch (error) {
    next(error);
  }
}
