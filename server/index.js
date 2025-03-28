import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { createClient } from 'redis';

const app = express();
const PORT = process.env.PORT || 4000;
const API_BASE_URL = 'https://api.odin.fun/v1';

// Cache expiry times in seconds
const CACHE_EXPIRY = {
  DEFAULT: parseInt(process.env.DEFAULT_CACHE_EXPIRY || 10800),     // 3 hours for dashboard
  RECENT_TOKENS: 30,                                                // 30 seconds for recently launched tokens
  NEWEST_TOKENS: parseInt(process.env.NEWEST_TOKENS_EXPIRY || 20),  // 20 seconds for 4 newest tokens
  OLDER_RECENT_TOKENS: parseInt(process.env.OLDER_TOKENS_EXPIRY || 120), // 2 minutes for older recent tokens
  TOKEN_HOLDERS: 60                                                 // 1 minute for token holder counts
};

// Add API rate limiter - global instance to throttle all external API calls
const apiRateLimiter = {
  lastCallTime: 0,
  minDelay: 300, // 300ms entre toutes les requêtes API
  
  // Fonction pour appliquer un délai si nécessaire avant un appel API
  async throttle(isDashboardRequest = false) {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    
    if (timeSinceLastCall < this.minDelay) {
      const delayNeeded = this.minDelay - timeSinceLastCall;
      console.log(`Rate limiting: waiting ${delayNeeded}ms before next API call`);
      await new Promise(resolve => setTimeout(resolve, delayNeeded));
    }
    
    // Mettre à jour le timestamp après le délai
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

// Modify fetchWithRetry to include dashboard parameter
async function fetchWithRetry(url, retryDelayMs = 30000, maxRetries = 3, isDashboard = false) {
  let retries = 0;
  
  while (retries <= maxRetries) {
    try {
      // Appliquer le throttling avant chaque requête externe
      await apiRateLimiter.throttle(isDashboard);
      
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

// Modifier getCachedOrFetch pour utiliser apiRateLimiter.throttle() avec isDashboard
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
      console.log(`Cache miss for ${cacheKey}, fetching dashboard data with retry mechanism and stricter rate limiting`);
      const data = await fetchWithRetry(apiUrl, 30000, 3, true); // Passer isDashboard=true
      
      // Cache the response
      await redisClient.set(cacheKey, JSON.stringify(data), { EX: expiryTime });
      return data;
    }
    
    // Pour les requêtes standard, appliquer le throttling normal
    await apiRateLimiter.throttle(false);

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
    const { limit = 26, offset = 4 } = req.query;
    const cacheKey = `older_recent_tokens_${limit}_${offset}`;
    
    // Use page parameter based on offset
    const page = Math.floor(offset / 20) + 1;
    // Calculate the remaining offset within the page
    const pageOffset = parseInt(offset) % 20;
    
    // Construct API URL with appropriate page and offset
    const apiUrl = `${API_BASE_URL}/tokens?sort=created_time%3Adesc&page=${page}&limit=${parseInt(limit) + pageOffset}&offset=${pageOffset}`;
    
    console.log(`Fetching older recent tokens with limit ${limit}, offset ${offset}, page ${page}, pageOffset ${pageOffset}`);
    
    const data = await getCachedOrFetch(cacheKey, apiUrl, CACHE_EXPIRY.OLDER_RECENT_TOKENS);
    
    // If we fetched with an offset within the page, slice the response to remove the offset items
    if (pageOffset > 0 && data.data && data.data.length > pageOffset) {
      data.data = data.data.slice(pageOffset);
    }
    
    console.log(`Returning ${data.data?.length || 0} older recent tokens`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get token holder data
app.get('/api/token/:id/holders', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `token_holders_${id}`;
    const apiUrl = `${API_BASE_URL}/token/${id}`;
    
    // Use short cache time for holder data
    const data = await getCachedOrFetch(cacheKey, apiUrl, CACHE_EXPIRY.TOKEN_HOLDERS);
    res.json(data);
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

// NOUVEAU: Endpoint pour récupérer les données précachées
app.get('/api/cached-data', async (req, res) => {
  try {
    console.log("Récupération des données précachées pour le client");
    
    // Récupérer les données du cache en parallèle
    const [topTokensData, recentTokensData, newestTokensData] = await Promise.all([
      redisClient.get('tokens_marketcap_100'),
      redisClient.get('recent_tokens_20'),
      redisClient.get('newest_tokens_4')
    ]);
    
    // Préparer les résultats
    const result = {};
    
    // Traiter les données des créateurs
    if (topTokensData) {
      const topTokens = JSON.parse(topTokensData).data || [];
      
      // Extraire les principaux creators et transformer en format CreatorPerformance
      // Simplification: on renvoie juste les tokens pour le moment
      // Le client va pouvoir utiliser ces données pour afficher rapidement quelque chose
      result.topTokens = topTokens;
      
      // Ici on pourrait prétraiter davantage les données pour les transformer en créateurs,
      // mais on va laisser le client faire ce calcul à partir des tokens pour simplifier
      // Exemple de structure qu'on pourrait renvoyer: { principal, username, tokens: [] }
    }
    
    // Traiter les tokens récents
    if (recentTokensData) {
      result.recentTokens = JSON.parse(recentTokensData).data || [];
    }
    
    // Traiter les tokens les plus récents
    if (newestTokensData) {
      result.newestTokens = JSON.parse(newestTokensData).data || [];
    }
    
    // Ajouter les timestamps de dernière mise à jour
    result.timestamps = {
      topTokens: await redisClient.ttl('tokens_marketcap_100'),
      recentTokens: await redisClient.ttl('recent_tokens_20'),
      newestTokens: await redisClient.ttl('newest_tokens_4')
    };
    
    res.json(result);
  } catch (error) {
    console.error("Erreur lors de la récupération des données précachées:", error);
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
  }, 10000); // 10 secondes (était 15 secondes)
  
  setInterval(() => {
    getCachedOrFetch(
      'recent_tokens_20',
      `${API_BASE_URL}/tokens?sort=created_time%3Adesc&page=1&limit=20`,
      CACHE_EXPIRY.RECENT_TOKENS
    ).catch(err => console.error("Erreur rafraîchissement tokens récents:", err));
  }, 30000); // 30 secondes (était 25 secondes)
  
  // Pour le dashboard, on va traiter les créateurs par lots avec un rate limit
  setInterval(async () => {
    console.log("Démarrage du rafraîchissement du dashboard...");
    try {
      // Récupérer d'abord les top tokens
      const topTokensData = await getCachedOrFetch(
        'tokens_marketcap_100', 
        `${API_BASE_URL}/tokens?sort=marketcap%3Adesc&page=1&limit=100`,
        CACHE_EXPIRY.DEFAULT,
        true
      );
      
      console.log("Données de base du dashboard rafraîchies");
    } catch (err) {
      console.error("Erreur rafraîchissement dashboard:", err);
    }
  }, 9000000); // 2h30m (150 minutes) - rafraîchissement 30min avant expiration du cache de 3h
  
  console.log("Rafraîchissements en arrière-plan programmés avec nouveaux intervalles: 10s/30s/2h30m");
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Précharger les données au démarrage
  preloadFrequentData();
  
  // Programmer les rafraîchissements
  scheduleBackgroundRefreshes();
}); 