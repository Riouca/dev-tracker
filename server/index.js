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

// Add API rate limiter - global instance to throttle all external API calls
const apiRateLimiter = {
  lastCallTime: 0,
  minDelay: 700, // 700ms between API calls
  // Fonction pour appliquer un délai si nécessaire avant un appel API
  async throttle() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    
    if (timeSinceLastCall < this.minDelay) {
      const delayNeeded = this.minDelay - timeSinceLastCall;
      console.log(`Rate limiting: waiting ${delayNeeded}ms before next API call`);
      await new Promise(resolve => setTimeout(resolve, delayNeeded));
    }
    
    // Mettre à jour le timestamp après le délai éventuel
    this.lastCallTime = Date.now();
  }
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

// Remplacer la fonction fetchWithRetry
async function fetchWithRetry(url, retryDelayMs = 30000, maxRetries = 3) {
  let retries = 0;
  
  while (retries <= maxRetries) {
    try {
      // Appliquer le throttling avant chaque requête externe
      await apiRateLimiter.throttle();
      
      // Faire l'appel API
      console.log(`Making API call to: ${url}`);
      const response = await axios.get(url);
      return response.data;
      
    } catch (error) {
      // Si c'est une erreur 429 (Too Many Requests) et qu'on n'a pas dépassé le nombre max de retries
      if (error.response && error.response.status === 429 && retries < maxRetries) {
        retries++;
        console.log(`Received 429 Too Many Requests for ${url}. Retry ${retries}/${maxRetries} after ${retryDelayMs/1000}s pause...`);
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      } else {
        // Pour les autres erreurs ou si on a dépassé le nombre de retries, on remonte l'erreur
        throw error;
      }
    }
  }
}

// Modifier getCachedOrFetch pour utiliser apiRateLimiter.throttle()
async function getCachedOrFetch(cacheKey, apiUrl, expiryTime = CACHE_EXPIRY.DEFAULT, isDashboard = false) {
  try {
    // Optimisation: vérifier si les données correspondent à des clés préchargées
    const preloadedKey = getPreloadedKey(cacheKey, apiUrl);
    if (preloadedKey && preloadedKey !== cacheKey) {
      console.log(`Redirecting to preloaded cache key: ${preloadedKey} instead of ${cacheKey}`);
      cacheKey = preloadedKey;
    }
    
    // Try to get from cache
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for ${cacheKey}`);
      return JSON.parse(cachedData);
    }

    // Si c'est une requête dashboard, utiliser fetchWithRetry
    if (isDashboard) {
      console.log(`Cache miss for ${cacheKey}, fetching dashboard data with retry mechanism`);
      const data = await fetchWithRetry(apiUrl);
      
      // Cache the response
      await redisClient.set(cacheKey, JSON.stringify(data), { EX: expiryTime });
      return data;
    }
    
    // Pour les requêtes standard, appliquer le throttling
    await apiRateLimiter.throttle();

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

// Helper function to map requested keys to preloaded keys when possible
function getPreloadedKey(cacheKey, apiUrl) {
  // Map des URLs API vers les clés préchargées correspondantes
  const preloadedKeyMappings = [
    // Dashboard data
    {
      pattern: /tokens\?sort=marketcap%3Adesc.*limit=(\d+)/,
      condition: (matches) => parseInt(matches[1]) <= 100,
      keyTemplate: 'tokens_marketcap_100'
    },
    // Recent tokens
    {
      pattern: /tokens\?sort=created_time%3Adesc.*limit=(\d+)/,
      condition: (matches) => parseInt(matches[1]) <= 20,
      keyTemplate: 'recent_tokens_20'
    },
    // Newest tokens
    {
      pattern: /tokens\?sort=created_time%3Adesc.*limit=(\d+)/,
      condition: (matches) => parseInt(matches[1]) <= 4,
      keyTemplate: 'newest_tokens_4'
    }
  ];
  
  // Parcourir les mappings pour trouver une correspondance
  for (const mapping of preloadedKeyMappings) {
    const matches = apiUrl.match(mapping.pattern);
    if (matches && mapping.condition(matches)) {
      return mapping.keyTemplate;
    }
  }
  
  return null; // Pas de clé préchargée correspondante
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
    
    // Indiquer que c'est une requête dashboard si c'est pour le tri marketcap avec un grand limit
    const isDashboard = sort === 'marketcap' && limit >= 50;
    
    const data = await getCachedOrFetch(cacheKey, apiUrl, expiryTime, isDashboard);
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

// Endpoint optimisé pour le dashboard - chargement par parties
app.get('/api/dashboard-parts', async (req, res) => {
  try {
    const { part = 'top', limit = 20 } = req.query;
    const sort = 'marketcap';
    
    if (part === 'top') {
      // Première partie: top N créateurs (affichage rapide)
      const cacheKey = `dashboard_top_${limit}`;
      const apiUrl = `${API_BASE_URL}/tokens?sort=${sort}%3Adesc&page=1&limit=${limit}`;
      
      const data = await getCachedOrFetch(cacheKey, apiUrl, CACHE_EXPIRY.DEFAULT, true);
      return res.json(data);
    } 
    else if (part === 'rest') {
      // Seconde partie: le reste des créateurs
      const startIndex = parseInt(req.query.start || 20);
      const restLimit = parseInt(req.query.restLimit || 80);
      
      const cacheKey = `dashboard_rest_${startIndex}_${restLimit}`;
      const apiUrl = `${API_BASE_URL}/tokens?sort=${sort}%3Adesc&page=${Math.floor(startIndex/20) + 1}&limit=${restLimit}`;
      
      const data = await getCachedOrFetch(cacheKey, apiUrl, CACHE_EXPIRY.DEFAULT, true);
      return res.json(data);
    }
    
    res.status(400).json({ error: 'Invalid part parameter' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Préchargement des données fréquemment utilisées
async function preloadFrequentData() {
  try {
    console.log("Préchargement des données fréquentes...");
    
    // Précharger en parallèle
    await Promise.all([
      // Dashboard data (top tokens)
      getCachedOrFetch(
        'tokens_marketcap_100', 
        `${API_BASE_URL}/tokens?sort=marketcap%3Adesc&page=1&limit=100`,
        CACHE_EXPIRY.DEFAULT,
        true
      ).catch(err => console.error("Erreur préchargement dashboard:", err)),
      
      // Recent tokens data
      getCachedOrFetch(
        'recent_tokens_20',
        `${API_BASE_URL}/tokens?sort=created_time%3Adesc&page=1&limit=20`,
        CACHE_EXPIRY.RECENT_TOKENS
      ).catch(err => console.error("Erreur préchargement tokens récents:", err)),
      
      // Newest tokens
      getCachedOrFetch(
        'newest_tokens_4',
        `${API_BASE_URL}/tokens?sort=created_time%3Adesc&page=1&limit=4`,
        CACHE_EXPIRY.NEWEST_TOKENS
      ).catch(err => console.error("Erreur préchargement newest tokens:", err))
    ]);
    
    console.log("Préchargement terminé");
  } catch (error) {
    console.error("Erreur générale de préchargement:", error);
  }
}

// Programmer les rafraîchissements en arrière-plan
function scheduleBackgroundRefreshes() {
  // Plus fréquent pour les données récentes, moins pour le dashboard
  setInterval(() => {
    getCachedOrFetch(
      'newest_tokens_4',
      `${API_BASE_URL}/tokens?sort=created_time%3Adesc&page=1&limit=4`,
      CACHE_EXPIRY.NEWEST_TOKENS
    ).catch(err => console.error("Erreur rafraîchissement newest tokens:", err));
  }, 15000); // 15 secondes
  
  setInterval(() => {
    getCachedOrFetch(
      'recent_tokens_20',
      `${API_BASE_URL}/tokens?sort=created_time%3Adesc&page=1&limit=20`,
      CACHE_EXPIRY.RECENT_TOKENS
    ).catch(err => console.error("Erreur rafraîchissement tokens récents:", err));
  }, 25000); // 25 secondes
  
  setInterval(() => {
    getCachedOrFetch(
      'tokens_marketcap_100', 
      `${API_BASE_URL}/tokens?sort=marketcap%3Adesc&page=1&limit=100`,
      CACHE_EXPIRY.DEFAULT,
      true
    ).catch(err => console.error("Erreur rafraîchissement dashboard:", err));
  }, 600000); // 10 minutes
  
  console.log("Rafraîchissements en arrière-plan programmés");
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Précharger les données au démarrage
  preloadFrequentData();
  
  // Programmer les rafraîchissements
  scheduleBackgroundRefreshes();
}); 