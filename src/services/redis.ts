// Browser-compatible Redis-like cache service
// This is a sessionStorage implementation that mimics the Redis interface

// Cache expiry time - 30 minutes in milliseconds
const CACHE_EXPIRY_TIME = 30 * 60 * 1000;

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// Get data from cache
export const getFromRedis = async <T>(key: string): Promise<T | null> => {
  try {
    const storedData = sessionStorage.getItem(key);
    if (!storedData) {
      return null;
    }

    const cacheItem: CacheItem<T> = JSON.parse(storedData);
    const now = Date.now();
    
    // Check if cache is expired
    if (now - cacheItem.timestamp > CACHE_EXPIRY_TIME) {
      sessionStorage.removeItem(key);
      return null;
    }
    
    console.log(`Using cached data from sessionStorage for key: ${key}`);
    return cacheItem.data;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
};

// Set data in cache with expiry
export const setInRedis = async <T>(key: string, data: T, expiryInSeconds = 1800): Promise<void> => {
  try {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now()
    };
    
    sessionStorage.setItem(key, JSON.stringify(cacheItem));
    console.log(`Data cached in sessionStorage for key: ${key}`);
  } catch (error) {
    console.error('Cache set error:', error);
  }
};

// Export a dummy Redis client to maintain API compatibility
const redisClient = {
  isOpen: true,
  connect: async () => Promise.resolve(),
  on: () => ({})
};

export default redisClient; 