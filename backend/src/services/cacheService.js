import { logger } from '../utils/logger.js';

class CacheService {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Get cached data by key, checks expiration.
   * @param {string} key 
   * @returns {*} cached data or null
   */
  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    const entry = this.cache.get(key);
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      logger.info(`Cache expired for key: ${key.substring(0, 50)}`);
      return null;
    }

    return entry.value;
  }

  /**
   * Set cached data for key with a TTL in milliseconds.
   * @param {string} key 
   * @param {*} value 
   * @param {number} ttlMs 
   */
  set(key, value, ttlMs = 300000) { // Default 5 mins TTL
    // Prevent unbounded memory growth by limiting cache size to 1000 items
    if (this.cache.size >= 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const expiry = Date.now() + ttlMs;
    this.cache.set(key, { value, expiry });
  }

  /**
   * Remove cached item
   * @param {string} key 
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Reset cache
   */
  clear() {
    this.cache.clear();
  }
}

export const cacheService = new CacheService();
