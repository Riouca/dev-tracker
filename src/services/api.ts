import axios from 'axios';

// Use the proxy server
const PROXY_BASE_URL = 'http://localhost:4000/api';
const API_BASE_URL = 'https://api.odin.fun/v1';

// Vérifier si nous sommes en production ou en développement
const isProduction = process.env.NODE_ENV === 'production';

// Utiliser l'URL appropriée selon l'environnement
const BASE_URL = isProduction ? '/api' : PROXY_BASE_URL;

export interface Token {
  id: string;
  name: string;
  description: string;
  image: string;
  creator: string;
  created_time: string;
  volume: number;
  bonded: boolean;
  icrc_ledger: string;
  price: number; // Raw price from API
  price_in_sats?: number; // Converted price in sats (optional)
  price_change_24h?: number; // Price change percentage in the last 24 hours
  marketcap: number;
  rune: string;
  featured: boolean;
  holder_count: number;
  holder_top: number;
  holder_dev: number;
  comment_count: number;
  sold: number;
  twitter: string;
  website: string;
  telegram: string;
  last_comment_time: string | null;
  sell_count: number;
  buy_count: number;
  ticker: string;
  btc_liquidity: number;
  token_liquidity: number;
  user_btc_liquidity: number;
  user_token_liquidity: number;
  user_lp_tokens: number;
  total_supply: number;
  swap_fees: number;
  swap_fees_24: number;
  swap_volume: number;
  swap_volume_24: number;
  threshold: number;
  txn_count: number;
  divisibility: number;
  decimals: number;
  withdrawals: boolean;
  deposits: boolean;
  trading: boolean;
  external: boolean;
  price_5m: number;
  price_1h: number;
  price_6h: number;
  price_1d: number;
  rune_id: string;
  last_action_time: string;
  is_active?: boolean; // Whether the token is active based on price and activity
  inactive_reason?: string; // Reason why the token is inactive
}

export interface Trade {
  id: string;
  user: string;
  token: string;
  time: string;
  buy: boolean;
  amount_btc: number;
  amount_token: number;
  price: number;
  bonded: boolean;
  user_username: string;
  user_image: string;
  decimals: number;
  divisibility: number;
}

export interface User {
  principal: string;
  username: string;
  bio: string | null;
  image: string | null;
  referrer: string | null;
  admin: boolean;
  ref_code: string;
  profit: number | null;
  total_asset_value: number | null;
  referral_earnings: number;
  referral_count: number;
  access_allowed: boolean;
  beta_access_codes: string;
  btc_deposit_address: string;
  btc_wallet_address: string;
  blife_id: string;
  created_at: string;
  rune_deposit_address: string;
}

export interface CreatorPerformance {
  principal: string;
  username: string;
  image: string | null;
  totalTokens: number;
  activeTokens: number;
  totalVolume: number;
  btcVolume?: number;
  successRate: number;
  weightedScore: number;
  confidenceScore: number;
  rank?: number;
  totalHolders?: number;
  totalTrades?: number;
  tokens: Token[];
  lastTokenCreated?: string;
  totalMarketcap: number;
  generatedMarketcapBTC: number;
  generatedMarketcapUSD: number;
}

// Utility functions
export const getTokenImageUrl = (tokenId: string): string => {
  return `https://images.odin.fun/token/${tokenId}`;
};

export const getUserImageUrl = (principal: string): string => {
  return `https://images.odin.fun/user/${principal}`;
};

export const convertPriceToSats = (rawPrice: number): number => {
  // Convert from raw price to sats
  // Raw price is in fractional BTC, so multiply by 100,000,000 to get sats
  return Math.round(rawPrice * 100000000);
};

export const convertVolumeToBTC = (volume: number): number => {
  // Convert from raw volume to BTC
  return volume / 100000000 / 1000;
};

export const convertMarketcapToBTC = (marketcap: number): number => {
  // Convert from raw marketcap to BTC
  return marketcap / 100000000 / 1000;
};

export const getBTCPrice = async (): Promise<number> => {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    return response.data.bitcoin.usd;
  } catch (error) {
    console.error('Error fetching BTC price:', error);
    return 60000; // Fallback to a reasonable estimate
  }
};

export const convertBTCToUSD = async (btcAmount: number): Promise<number> => {
  const btcPrice = await getBTCPrice();
  return btcAmount * btcPrice;
};

export const formatVolume = (volume: number, inUSD = false): string => {
  const btcVolume = convertVolumeToBTC(volume);
  
  if (inUSD) {
    // Rough USD conversion (1 BTC ~ $60,000)
    const usdVolume = btcVolume * 60000;
    
    if (usdVolume >= 1000000) {
      return `$${(usdVolume / 1000000).toFixed(1)}M`;
    } else if (usdVolume >= 1000) {
      return `$${(usdVolume / 1000).toFixed(1)}K`;
    } else {
      return `$${usdVolume.toFixed(0)}`;
    }
  } else {
    // BTC format
    if (btcVolume >= 1000) {
      return `${(btcVolume / 1000).toFixed(1)}K BTC`;
    } else if (btcVolume >= 1) {
      return `${btcVolume.toFixed(2)} BTC`;
    } else if (btcVolume >= 0.001) {
      return `${(btcVolume * 1000).toFixed(2)} mBTC`;
    } else {
      return `${(btcVolume * 1000000).toFixed(0)} sats`;
    }
  }
};

export const formatMarketcap = (marketcap: number, inUSD = false): string => {
  const btcMarketcap = convertMarketcapToBTC(marketcap);
  
  if (inUSD) {
    // Rough USD conversion (1 BTC ~ $60,000)
    const usdMarketcap = btcMarketcap * 60000;
    
    if (usdMarketcap >= 1000000) {
      return `$${(usdMarketcap / 1000000).toFixed(1)}M`;
    } else if (usdMarketcap >= 1000) {
      return `$${(usdMarketcap / 1000).toFixed(1)}K`;
    } else {
      return `$${usdMarketcap.toFixed(0)}`;
    }
  } else {
    // BTC format
    if (btcMarketcap >= 1000) {
      return `${(btcMarketcap / 1000).toFixed(1)}K BTC`;
    } else if (btcMarketcap >= 1) {
      return `${btcMarketcap.toFixed(2)} BTC`;
    } else if (btcMarketcap >= 0.001) {
      return `${(btcMarketcap * 1000).toFixed(2)} mBTC`;
    } else {
      return `${(btcMarketcap * 1000000).toFixed(0)} sats`;
    }
  }
};

export const isTokenActive = (token: Token): boolean => {
  // Check if token is priced too low
  const inactiveThreshold = 0.000000001; // 1 sat per token
  const notEnoughVolume = 0.00000001; // Minimum volume threshold (converted to BTC)
  
  let active = true;
  let reason = '';
  
  if (token.price < inactiveThreshold) {
    active = false;
    reason = 'Price too low';
  }
  
  // Check if token has had recent trading activity
  else if (token.volume < notEnoughVolume) {
    active = false;
    reason = 'No trading volume';
  }
  
  // Check if token is tradable
  else if (!token.trading) {
    active = false;
    reason = 'Trading disabled';
  }
  
  // Set inactive status and reason
  token.is_active = active;
  token.inactive_reason = active ? '' : reason;
  
  return active;
};

// API functions using server endpoints with Redis cache

// Get individual token by ID
export const getToken = async (tokenId: string): Promise<Token> => {
  try {
    // Fetch from API via proxy with Redis cache
    const response = await axios.get(`${BASE_URL}/token/${tokenId}`);
    const token = response.data;
    
    // Process token data
    if (token) {
      token.price_in_sats = convertPriceToSats(token.price);
      isTokenActive(token);
    }
    
    return token;
  } catch (error) {
    console.error(`Error fetching token ${tokenId}:`, error);
    throw new Error(`Token not found: ${tokenId}`);
  }
};

// Get user/creator by principal
export const getUser = async (principal: string): Promise<any> => {
  try {
    // Use proxy server which utilizes Redis cache
    const response = await axios.get(`${BASE_URL}/user/${principal}`);
    const user = response.data;
    
    return user;
  } catch (error) {
    console.error(`Error fetching user ${principal}:`, error);
    throw new Error(`User not found: ${principal}`);
  }
};

// Get token trades
export const getTokenTrades = async (tokenId: string, limit = 50): Promise<Trade[]> => {
  try {
    const response = await axios.get(`${BASE_URL}/token/${tokenId}/trades`, {
      params: { limit }
    });
    
    return response.data.data || [];
  } catch (error) {
    console.error(`Error fetching token trades:`, error);
    return [];
  }
};

// Get top tokens by criteria
export const getTopTokens = async (limit = 30, sort = 'marketcap'): Promise<Token[]> => {
  try {
    const response = await axios.get(`${BASE_URL}/tokens`, {
      params: { 
        sort, 
        limit,
        _t: Date.now() // Cache busting parameter
      }
    });
    
    const tokens = response.data.data || [];
    
    // Process tokens
    return tokens.map((token: Token) => {
      token.price_in_sats = convertPriceToSats(token.price);
      isTokenActive(token);
      return token;
    });
  } catch (error) {
    console.error('Error fetching top tokens:', error);
    return [];
  }
};

// Get tokens by creator
export const getCreatorTokens = async (principal: string, limit = 20, forceRefresh = false): Promise<Token[]> => {
  try {
    // Add cache busting for forced refresh
    const timestamp = forceRefresh ? Date.now() : '';
    
    const response = await axios.get(`${BASE_URL}/creator/${principal}/tokens`, {
      params: { 
        limit,
        _t: timestamp
      }
    });
    
    const tokens = response.data.data || [];
    
    // Process tokens
    return tokens.map((token: Token) => {
      token.price_in_sats = convertPriceToSats(token.price);
      isTokenActive(token);
      return token;
    });
  } catch (error) {
    console.error(`Error fetching creator tokens:`, error);
    return [];
  }
};

// Calculate performance metrics for a creator
export const calculateCreatorPerformance = async (
  principal: string,
  forceRefresh = false
): Promise<CreatorPerformance | null> => {
  try {
    const tokens = await getCreatorTokens(principal, 50, forceRefresh);
    
    if (!tokens || tokens.length === 0) {
      return null;
    }
    
    // Get creator info from the first token
    const firstToken = tokens[0];
    
    // Filter active tokens (has price and is tradable)
    const activeTokens = tokens.filter(token => token.is_active);
    
    // Calculate total volume across all tokens
    const totalVolume = tokens.reduce((sum, token) => sum + token.volume, 0);
    
    // Calculate BTC volume 
    const btcVolume = totalVolume / 100000000 / 1000;  // Convert to BTC
    
    // Calculate success rate: percentage of tokens that are active vs all tokens
    const successRate = tokens.length > 0 ? (activeTokens.length / tokens.length) * 100 : 0;
    
    // Calculate total marketcap of all tokens
    const totalMarketcap = tokens.reduce((sum, token) => sum + token.marketcap, 0);
    
    // Calculate total holders across all tokens
    const totalHolders = tokens.reduce((sum, token) => sum + token.holder_count, 0);
    
    // Calculate total trades (buys + sells)
    const totalTrades = tokens.reduce((sum, token) => sum + token.buy_count + token.sell_count, 0);
    
    // Find the most recent token by creation date
    let lastTokenCreated = '';
    if (tokens.length > 0) {
      const sortedByDate = [...tokens].sort((a, b) => 
        new Date(b.created_time).getTime() - new Date(a.created_time).getTime()
      );
      lastTokenCreated = sortedByDate[0].created_time;
    }
    
    // Generate a weighted score that factors in:
    // - Volume (40% weight)
    // - Success rate (30% weight)
    // - Number of tokens created (10% weight)
    // - Total holders (20% weight)
    
    // Normalize values
    const normalizedVolume = Math.min(1, btcVolume / 50); // Cap at 50 BTC
    const normalizedSuccessRate = successRate / 100;
    const normalizedTokenCount = Math.min(1, tokens.length / 10); // Cap at 10 tokens
    const normalizedHolders = Math.min(1, totalHolders / 1000); // Cap at 1000 holders
    
    // Calculate weighted score (0-100)
    const weightedScore = 
      (normalizedVolume * 40) + 
      (normalizedSuccessRate * 30) + 
      (normalizedTokenCount * 10) + 
      (normalizedHolders * 20);
    
    // Calculate a confidence score (0-100) weighted more towards successful tokens
    // than just volume, which avoids rewarding pump and dumps
    const confidenceScore = 
      (normalizedVolume * 30) + 
      (normalizedSuccessRate * 40) + 
      (normalizedTokenCount * 10) + 
      (normalizedHolders * 20);
    
    // Convert to BTC for display purposes
    const generatedMarketcapBTC = totalMarketcap / 100000000 / 1000;
    
    // Rough USD conversion (1 BTC ~ $60k)
    const generatedMarketcapUSD = generatedMarketcapBTC * 60000;
    
    return {
      principal,
      username: tokens[0]?.creator || principal.substring(0, 8),
      image: null, // Will be filled in if available
      totalTokens: tokens.length,
      activeTokens: activeTokens.length,
      totalVolume,
      btcVolume,
      successRate,
      weightedScore,
      confidenceScore,
      tokens,
      totalHolders,
      totalTrades,
      lastTokenCreated,
      totalMarketcap,
      generatedMarketcapBTC,
      generatedMarketcapUSD
    };
  } catch (error) {
    console.error(`Error calculating creator performance for ${principal}:`, error);
    return null;
  }
};

// Types and functions for creator management
export type CreatorSortOption = 'volume' | 'active' | 'weighted' | 'confidence' | 'success' | 'tokens' | 'holders';

// Helper function to retry API calls
const retryApiCall = async <T>(
  apiCall: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      console.error(`API call failed (attempt ${attempt}/${maxRetries}):`, error);
      lastError = error;
      
      if (attempt < maxRetries) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError;
};

// Find top creators
export const findTopCreators = async (
  limit = 200, 
  sortBy: CreatorSortOption = 'confidence',
  forceRefresh = false
): Promise<CreatorPerformance[]> => {
  try {
    // Cache busting parameter for forced refresh
    const timestamp = forceRefresh ? Date.now() : '';
    
    // Use proxy endpoint to fetch via Redis server cache
    const response = await axios.get(`${BASE_URL}/dashboard-parts`, {
      params: {
        part: 'top',
        limit: 20,
        _t: timestamp
      }
    });
    
    // Initial top tokens by marketcap
    const tokens = response.data.data || [];
    
    // Use a map to track creator performances by principal
    const creatorMap = new Map<string, CreatorPerformance>();
    const creators: CreatorPerformance[] = [];
    
    // Group tokens by creator
    for (const token of tokens) {
      // Add price_in_sats and activity
      token.price_in_sats = convertPriceToSats(token.price);
      isTokenActive(token);
      
      const creatorId = token.creator;
      
      if (!creatorMap.has(creatorId)) {
        // Calculate creator metrics
        const creatorPerf = await calculateCreatorPerformance(creatorId, forceRefresh);
        
        if (creatorPerf) {
          creatorMap.set(creatorId, creatorPerf);
          creators.push(creatorPerf);
        }
      }
    }
    
    // Sort creators by selected criteria
    const sortedCreators = sortCreatorsData(creators, sortBy, limit);
    
    // Update rank based on sorted order
    sortedCreators.forEach((creator, index) => {
      creator.rank = index + 1;
    });
    
    return sortedCreators;
  } catch (error) {
    console.error(`Error finding top creators:`, error);
    return [];
  }
};

// Helper function to sort creators by different metrics
const sortCreatorsData = (
  creators: CreatorPerformance[], 
  sortBy: CreatorSortOption, 
  limit: number
): CreatorPerformance[] => {
  let sortedCreators = [...creators];
  
  switch (sortBy) {
    case 'volume':
      sortedCreators.sort((a, b) => b.totalVolume - a.totalVolume);
      break;
    case 'active':
      sortedCreators.sort((a, b) => b.activeTokens - a.activeTokens);
      break;
    case 'weighted':
      sortedCreators.sort((a, b) => b.weightedScore - a.weightedScore);
      break;
    case 'confidence':
      sortedCreators.sort((a, b) => b.confidenceScore - a.confidenceScore);
      break;
    case 'success':
      sortedCreators.sort((a, b) => b.successRate - a.successRate);
      break;
    case 'tokens':
      sortedCreators.sort((a, b) => b.totalTokens - a.totalTokens);
      break;
    case 'holders':
      sortedCreators.sort((a, b) => {
        const aHolders = a.totalHolders || 0;
        const bHolders = b.totalHolders || 0;
        return bHolders - aHolders;
      });
      break;
    default:
      sortedCreators.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }
  
  // Limit results 
  return sortedCreators.slice(0, limit);
};

// Get tokens from followed creators (using localStorage)
export const getFollowedCreatorsTokens = async (creatorPrincipals: string[]): Promise<Token[]> => {
  try {
    if (!creatorPrincipals || creatorPrincipals.length === 0) {
      return [];
    }
    
    // Fetch tokens in parallel for each creator
    const creatorTokensPromises = creatorPrincipals.map(principal => 
      getCreatorTokens(principal)
    );
    
    const results = await Promise.all(creatorTokensPromises);
    
    // Flatten results and sort by creation time (newest first)
    const allTokens = results.flat();
    allTokens.sort((a, b) => 
      new Date(b.created_time).getTime() - new Date(a.created_time).getTime()
    );
    
    return allTokens;
  } catch (error) {
    console.error('Error fetching followed creators tokens:', error);
    return [];
  }
};

// Helper to get rarity level
export const getRarityLevel = (score: number): string => {
  if (score >= 90) return 'legendary';
  if (score >= 80) return 'epic';
  if (score >= 70) return 'great';
  if (score >= 60) return 'okay';
  if (score >= 50) return 'neutral';
  if (score >= 40) return 'meh';
  return 'scam';
};

// Get user trades
export const getUserTrades = async (principal: string, limit = 10): Promise<Trade[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/user/${principal}/trades`, {
      params: { limit }
    });
    
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching user trades:', error);
    return [];
  }
};

// Get recently launched tokens
export const getRecentlyLaunchedTokens = async (limit = 20): Promise<Token[]> => {
  try {
    // Use dedicated API endpoint for recent tokens with better caching
    const response = await axios.get(`${BASE_URL}/recent-tokens`, {
      params: { 
        limit,
        _t: Date.now() // Cache busting parameter
      }
    });
    
    const tokens = response.data.data || [];
    
    // Process tokens
    return tokens.map((token: Token) => {
      token.price_in_sats = convertPriceToSats(token.price);
      isTokenActive(token);
      return token;
    });
  } catch (error) {
    console.error('Error fetching recently launched tokens:', error);
    return [];
  }
};

// Get newest tokens (1-4)
export const getNewestTokens = async (): Promise<Token[]> => {
  try {
    // Use optimized endpoint for newest tokens
    const response = await axios.get(`${BASE_URL}/newest-tokens`, {
      params: {
        _t: Date.now() // Cache busting parameter for frontend
      }
    });
    
    const tokens = response.data.data || [];
    
    // Process tokens
    return tokens.map((token: Token) => {
      token.price_in_sats = convertPriceToSats(token.price);
      isTokenActive(token);
      return token;
    });
  } catch (error) {
    console.error('Error fetching newest tokens:', error);
    return [];
  }
};

// Get older recent tokens (5-30)
export const getOlderRecentTokens = async (limit = 26): Promise<Token[]> => {
  try {
    // Use optimized endpoint for older recent tokens
    const response = await axios.get(`${BASE_URL}/older-recent-tokens`, {
      params: { 
        limit,
        _t: Date.now()  // Cache busting parameter
      }
    });
    
    const tokens = response.data.data || [];
    
    // Process tokens
    return tokens.map((token: Token) => {
      token.price_in_sats = convertPriceToSats(token.price);
      isTokenActive(token);
      return token;
    });
  } catch (error) {
    console.error('Error fetching older recent tokens:', error);
    return [];
  }
};

// Get token holder data only
export const getTokenHolderData = async (tokenId: string): Promise<{ 
  holder_count: number, 
  holder_top: number, 
  holder_dev: number 
}> => {
  try {
    // Use dedicated endpoint with shorter cache time
    const response = await axios.get(`${BASE_URL}/token/${tokenId}/holders`);
    
    return {
      holder_count: response.data.holder_count || 0,
      holder_top: response.data.holder_top || 0,
      holder_dev: response.data.holder_dev || 0
    };
  } catch (error) {
    console.error(`Error fetching token holders for ${tokenId}:`, error);
    return {
      holder_count: 0,
      holder_top: 0,
      holder_dev: 0
    };
  }
}; 