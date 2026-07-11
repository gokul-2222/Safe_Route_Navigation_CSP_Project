import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { cacheService } from './cacheService.js';

const CACHE_TTL_MS = 3600 * 1000; // 1 hour for geocoding

export async function searchAddress(query) {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('Invalid search query');
  }

  const cacheKey = `search:${query.trim().toLowerCase()}`;
  const cachedData = cacheService.get(cacheKey);
  if (cachedData) {
    logger.info(`Geocode cache hit for query: "${query}"`);
    return cachedData;
  }

  const url = `${config.nominatimBaseUrl}/search?format=json&q=${encodeURIComponent(query)}&limit=8`;
  logger.info(`Proxying geocode search for query: "${query}"`);
  
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000), // 5 seconds timeout
      headers: {
        'User-Agent': 'SafeRouteNavigator/1.0 (rites)',
        'Accept-Language': 'en,hi,ta,kn,te'
      }
    });
    
    if (response.status === 429) {
      const err = new Error('Too Many Requests from Nominatim API');
      err.statusCode = 429;
      throw err;
    }

    if (!response.ok) {
      const err = new Error(`Nominatim geocoding search failed with status ${response.status}`);
      err.statusCode = response.status >= 500 ? 503 : 500;
      throw err;
    }
    
    const data = await response.json();
    cacheService.set(cacheKey, data, CACHE_TTL_MS);
    return data;
  } catch (error) {
    if (error.name === 'TimeoutError') {
      const err = new Error('Geocoding search request timed out');
      err.statusCode = 504;
      throw err;
    }
    throw error;
  }
}

export async function reverseGeocode(lat, lon) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    const err = new Error('Invalid latitude or longitude coordinates');
    err.statusCode = 400;
    throw err;
  }

  const cacheKey = `reverse:${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  const cachedData = cacheService.get(cacheKey);
  if (cachedData) {
    logger.info(`Reverse geocode cache hit for coords: ${latitude}, ${longitude}`);
    return cachedData;
  }

  const url = `${config.nominatimBaseUrl}/reverse?format=json&lat=${latitude}&lon=${longitude}`;
  logger.info(`Proxying reverse geocode for coords: ${latitude}, ${longitude}`);
  
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000), // 5 seconds timeout
      headers: {
        'User-Agent': 'SafeRouteNavigator/1.0 (rites)',
        'Accept-Language': 'en,hi,ta,kn,te'
      }
    });
    
    if (response.status === 429) {
      const err = new Error('Too Many Requests from Nominatim API');
      err.statusCode = 429;
      throw err;
    }

    if (!response.ok) {
      const err = new Error(`Nominatim reverse geocoding failed with status ${response.status}`);
      err.statusCode = response.status >= 500 ? 503 : 500;
      throw err;
    }
    
    const data = await response.json();
    cacheService.set(cacheKey, data, CACHE_TTL_MS);
    return data;
  } catch (error) {
    if (error.name === 'TimeoutError') {
      const err = new Error('Reverse geocoding request timed out');
      err.statusCode = 504;
      throw err;
    }
    throw error;
  }
}
