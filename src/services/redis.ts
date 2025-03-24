// Browser-compatible Redis-like cache service
// This is a localStorage implementation that mimics the Redis interface

// Cache expiry time - 30 minutes in milliseconds
const CACHE_EXPIRY_TIME = 30 * 60 * 1000;

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// Get data from cache
export const getFromRedis = async <T>(key: string): Promise<T | null> => {
  try {
    const storedData = localStorage.getItem(key);
    if (!storedData) {
      return null;
    }

    const cacheItem: CacheItem<T> = JSON.parse(storedData);
    const now = Date.now();
    
    // Check if cache is expired
    if (now - cacheItem.timestamp > CACHE_EXPIRY_TIME) {
      localStorage.removeItem(key);
      return null;
    }
    
    console.log(`Using cached data from localStorage for key: ${key}`);
    return cacheItem.data;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
};

// Set data in cache with expiry
export const setInRedis = async <T>(key: string, data: T, _expiryInSeconds = 1800): Promise<void> => {
  try {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now()
    };
    
    localStorage.setItem(key, JSON.stringify(cacheItem));
    console.log(`Data cached in localStorage for key: ${key}`);
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