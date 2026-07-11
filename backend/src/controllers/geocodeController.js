import * as geocodeService from '../services/geocodeService.js';

export async function search(req, res, next) {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing or invalid query parameter "q"'
      });
    }

    const results = await geocodeService.searchAddress(q.trim());
    res.json({ status: 'success', data: results });
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

export async function reverse(req, res, next) {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required query parameters: lat, lon'
      });
    }

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (isNaN(latNum) || isNaN(lonNum)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid coordinates: lat and lon must be numbers'
      });
    }

    const results = await geocodeService.reverseGeocode(latNum, lonNum);
    res.json({ status: 'success', data: results });
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
