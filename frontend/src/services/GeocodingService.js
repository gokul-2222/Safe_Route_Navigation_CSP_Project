const RECENT_SEARCHES_KEY = 'safepath_recent_searches';
const MAX_RECENT = 8;

// In-memory cache for current session
const _queryCache = new Map();
const CACHE_TTL_MS = 300000; // 5 minutes

function _getFromCache(key) {
  const entry = _queryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    _queryCache.delete(key);
    return null;
  }
  return entry.value;
}

function _setCache(key, value) {
  if (_queryCache.size >= 200) {
    // Evict oldest entry
    const firstKey = _queryCache.keys().next().value;
    _queryCache.delete(firstKey);
  }
  _queryCache.set(key, { value, expiry: Date.now() + CACHE_TTL_MS });
}

export const GeocodingService = {
  /**
   * Search for places using backend Nominatim proxy.
   * Returns an array of Nominatim result objects.
   */
  async search(query) {
    if (!query || query.trim().length < 2) return [];

    const cacheKey = `q:${query.trim().toLowerCase()}`;
    const cached = _getFromCache(cacheKey);
    if (cached) return cached;

    const url = `/api/v1/geocode/search?q=${encodeURIComponent(query.trim())}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Geocoding search failed: ${res.status}`);
    }
    const body = await res.json();
    const results = body.data || [];

    _setCache(cacheKey, results);
    return results;
  },

  /**
   * Reverse geocode a coordinate pair using backend proxy.
   * Returns Nominatim reverse object with display_name.
   */
  async reverse(lat, lon) {
    const cacheKey = `rev:${parseFloat(lat).toFixed(5)},${parseFloat(lon).toFixed(5)}`;
    const cached = _getFromCache(cacheKey);
    if (cached) return cached;

    const url = `/api/v1/geocode/reverse?lat=${lat}&lon=${lon}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Reverse geocoding failed: ${res.status}`);
    }
    const body = await res.json();
    const result = body.data || null;

    if (result) _setCache(cacheKey, result);
    return result;
  },

  /**
   * Save a selected location to recent searches in localStorage.
   */
  saveRecentSearch(displayName, lat, lon) {
    try {
      const recents = this.getRecentSearches();
      // Remove duplicate if exists
      const filtered = recents.filter(r => r.display_name !== displayName);
      // Prepend new entry
      filtered.unshift({ display_name: displayName, lat: String(lat), lon: String(lon) });
      // Keep only latest MAX_RECENT
      const trimmed = filtered.slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Could not save recent search:', e);
    }
  },

  /**
   * Retrieve recent searches from localStorage.
   */
  getRecentSearches() {
    try {
      return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
    } catch (e) {
      return [];
    }
  },

  /**
   * Clear recent searches from localStorage.
   */
  clearRecentSearches() {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  }
};
