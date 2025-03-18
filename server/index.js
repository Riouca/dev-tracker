import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { createClient } from 'redis';

const app = express();
const PORT = process.env.PORT || 4000;
const API_BASE_URL = 'https://api.odin.fun/v1';

// Cache expiry times in seconds
const CACHE_EXPIRY = {
  DEFAULT: parseInt(process.env.DEFAULT_CACHE_EXPIRY || 1200),      // 20 minutes for dashboard
  RECENT_TOKENS: 30,                                                // 30 seconds for recently launched tokens
  NEWEST_TOKENS: parseInt(process.env.NEWEST_TOKENS_EXPIRY || 20),  // 20 seconds for 4 newest tokens
  OLDER_RECENT_TOKENS: parseInt(process.env.OLDER_TOKENS_EXPIRY || 120), // 2 minutes for older recent tokens
  TOKEN_HOLDERS: 60                                                 // 1 minute for token holder counts
};

// Redis client setup
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

// Connect to Redis
await redisClient.connect().catch(err => {
  console.error('Failed to connect to Redis:', err);
  process.exit(1);
});

console.log('Connected to Redis');

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to get cached data or fetch from API
async function getCachedOrFetch(cacheKey, apiUrl, expiryTime = CACHE_EXPIRY.DEFAULT) {
  try {
    // Try to get from cache
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for ${cacheKey}`);
      return JSON.parse(cachedData);
    }

    // If not cached, fetch from API
    console.log(`Cache miss for ${cacheKey}, fetching from API: ${apiUrl}`);
    const response = await axios.get(apiUrl);
    const data = response.data;

    // Cache the response
    await redisClient.set(cacheKey, JSON.stringify(data), { EX: expiryTime });
    
    return data;
  } catch (error) {
    console.error(`Error for ${apiUrl}:`, error.message);
    throw error;
  }
}

// API Proxy Routes

// Get top tokens
app.get('/api/tokens', async (req, res) => {
  try {
    const { sort = 'marketcap', limit = 30 } = req.query;
    
    // Use different cache expiry time for recently launched tokens
    const expiryTime = sort === 'created_time' ? CACHE_EXPIRY.RECENT_TOKENS : CACHE_EXPIRY.DEFAULT;
    
    const cacheKey = `tokens_${sort}_${limit}`;
    const apiUrl = `${API_BASE_URL}/tokens?sort=${sort}%3Adesc&page=1&limit=${limit}`;
    
    const data = await getCachedOrFetch(cacheKey, apiUrl, expiryTime);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get token by ID
app.get('/api/token/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `token_${id}`;
    const apiUrl = `${API_BASE_URL}/token/${id}`;
    
    const data = await getCachedOrFetch(cacheKey, apiUrl);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get token trades
app.get('/api/token/:id/trades', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;
    const cacheKey = `token_trades_${id}_${limit}`;
    const apiUrl = `${API_BASE_URL}/token/${id}/trades?limit=${limit}`;
    
    // Use short cache time for trades as they're updated frequently
    const data = await getCachedOrFetch(cacheKey, apiUrl, CACHE_EXPIRY.RECENT_TOKENS);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get creator tokens
app.get('/api/creator/:principal/tokens', async (req, res) => {
  try {
    const { principal } = req.params;
    const { limit = 20 } = req.query;
    const cacheKey = `creator_tokens_${principal}_${limit}`;
    const apiUrl = `${API_BASE_URL}/tokens?creator=${principal}&limit=${limit}`;
    
    const data = await getCachedOrFetch(cacheKey, apiUrl, CACHE_EXPIRY.DEFAULT);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user info
app.get('/api/user/:principal', async (req, res) => {
  try {
    const { principal } = req.params;
    const cacheKey = `user_${principal}`;
    const apiUrl = `${API_BASE_URL}/user/${principal}`;
    
    const data = await getCachedOrFetch(cacheKey, apiUrl, CACHE_EXPIRY.DEFAULT);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user balances
app.get('/api/user/:principal/balances', async (req, res) => {
  try {
    const { principal } = req.params;
    const { lp = 'true', limit = '999999' } = req.query;
    const timestamp = new Date().toISOString();
    const cacheKey = `user_balances_${principal}`;
    const apiUrl = `${API_BASE_URL}/user/${principal}/balances?lp=${lp}&limit=${limit}&timestamp=${encodeURIComponent(timestamp)}`;
    
    const data = await getCachedOrFetch(cacheKey, apiUrl, CACHE_EXPIRY.DEFAULT);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add route for polling recently launched tokens
app.get('/api/recent-tokens', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const cacheKey = `recent_tokens_${limit}`;
    const apiUrl = `${API_BASE_URL}/tokens?sort=created_time%3Adesc&page=1&limit=${limit}`;
    
    const data = await getCachedOrFetch(cacheKey, apiUrl, CACHE_EXPIRY.RECENT_TOKENS);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manually invalidate cache for recently launched tokens
app.post('/api/invalidate-cache', async (req, res) => {
  try {
    const { key } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: 'Cache key is required' });
    }
    
    await redisClient.del(key);
    console.log(`Cache invalidated for key: ${key}`);
    
    res.json({ success: true, message: `Cache invalidated for key: ${key}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add route for newest tokens (1-4)
app.get('/api/newest-tokens', async (req, res) => {
  try {
    const cacheKey = 'newest_tokens_4';
    const apiUrl = `${API_BASE_URL}/tokens?sort=created_time%3Adesc&page=1&limit=4`;
    
    const data = await getCachedOrFetch(cacheKey, apiUrl, CACHE_EXPIRY.NEWEST_TOKENS);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add route for older recent tokens (5-30)
app.get('/api/older-recent-tokens', async (req, res) => {
  try {
    const { limit = 26 } = req.query;
    const cacheKey = `older_recent_tokens_${limit}`;
    const apiUrl = `${API_BASE_URL}/tokens?sort=created_time%3Adesc&page=2&limit=${limit}`;
    
    const data = await getCachedOrFetch(cacheKey, apiUrl, CACHE_EXPIRY.OLDER_RECENT_TOKENS);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add route for token holder data with shorter cache time
app.get('/api/token/:id/holders', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `token_holders_${id}`;
    const apiUrl = `${API_BASE_URL}/token/${id}`;
    
    const data = await getCachedOrFetch(cacheKey, apiUrl, CACHE_EXPIRY.TOKEN_HOLDERS);
    
    // Extract only the holder-related data to reduce response size
    const holderData = {
      id: data.id,
      name: data.name,
      holder_count: data.holder_count,
      holder_top: data.holder_top,
      holder_dev: data.holder_dev
    };
    
    res.json(holderData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 