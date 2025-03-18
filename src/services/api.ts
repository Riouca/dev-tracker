import axios from 'axios';
import { getFromRedis, setInRedis } from './redis';

// Use the proxy server
const PROXY_BASE_URL = 'http://localhost:4000/api';
const API_BASE_URL = 'https://api.odin.fun/v1';

const REDIS_TOP_TOKENS_KEY = 'dev_tracker_top_tokens';
const REDIS_TOKEN_KEY = 'dev_tracker_token';
const REDIS_CREATOR_TOKENS_KEY = 'dev_tracker_creator_tokens';

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
}

// Define TraderPerformance interface
export interface TraderPerformance {
  principal: string;
  username: string;
  image?: string | null;
  totalTokens: number;
  activeTokens: number;
  successRate: number;
  totalVolume: number;
  confidenceScore: number;
  recentTokens: string[];
  lastActive?: Date;
}

// Get token image URL
export const getTokenImageUrl = (tokenId: string): string => {
  return `https://images.odin.fun/token/${tokenId}`;
};

// Get user image URL
export const getUserImageUrl = (principal: string): string => {
  return `https://images.odin.fun/user/${principal}`;
};

// Convert raw price to sats
export const convertPriceToSats = (rawPrice: number): number => {
  // The raw price is in satoshis * 1000
  // For example, if raw price is 119, then it's 0.119 sats
  return rawPrice / 1000;
};

// Convert raw volume to BTC
export const convertVolumeToBTC = (volume: number): number => {
  // Raw volume is in sats, divide by 10^8 to get BTC
  return volume / 100000000;
};

// Convert raw marketcap to BTC
export const convertMarketcapToBTC = (marketcap: number): number => {
  // Raw marketcap is in sats, divide by 10^8 to get BTC
  return marketcap / 100000000;
};

// Get current BTC price in USD
export const getBTCPrice = async (): Promise<number> => {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    return response.data.bitcoin.usd;
  } catch (error) {
    console.error('Error fetching BTC price:', error);
    return 84000; // Fallback price if API fails
  }
};

// Convert BTC volume to USD
export const convertBTCToUSD = async (btcAmount: number): Promise<number> => {
  const btcPrice = await getBTCPrice();
  return btcAmount * btcPrice;
};

// Format volume for display
export const formatVolume = (volume: number, inUSD = false): string => {
  // Divide by 1000 to get correct value
  const btcVolume = convertVolumeToBTC(volume) / 1000;
  
  if (inUSD) {
    // For USD display
    const usdValue = btcVolume * 84000; // Use fallback BTC price
    
    if (usdValue >= 1000000) {
      return `$${(usdValue / 1000000).toFixed(1)}M`;
    } else if (usdValue >= 1000) {
      return `$${(usdValue / 1000).toFixed(1)}K`;
    } else {
      return `$${usdValue.toFixed(0)}`;
    }
  } else {
    // For BTC display
    if (btcVolume >= 1000) {
      return `${(btcVolume / 1000).toFixed(1)}K BTC`;
    } else if (btcVolume >= 1) {
      return `${btcVolume.toFixed(1)} BTC`;
    } else if (btcVolume >= 0.001) {
      return `${btcVolume.toFixed(3)} BTC`;
    } else {
      return `${(volume / 1000000 / 1000).toFixed(2)}M sats`;
    }
  }
};

// Format marketcap for display
export const formatMarketcap = (marketcap: number, inUSD = false): string => {
  // Divide by 1000 to get correct value
  const btcMarketcap = convertMarketcapToBTC(marketcap) / 1000;
  
  if (inUSD) {
    // For USD display
    const usdValue = btcMarketcap * 84000; // Use fallback BTC price
    
    if (usdValue >= 1000000) {
      return `$${(usdValue / 1000000).toFixed(1)}M`;
    } else if (usdValue >= 1000) {
      return `$${(usdValue / 1000).toFixed(1)}K`;
    } else {
      return `$${usdValue.toFixed(0)}`;
    }
  } else {
    // For BTC display
    if (btcMarketcap >= 1000) {
      return `${(btcMarketcap / 1000).toFixed(1)}K BTC`;
    } else if (btcMarketcap >= 1) {
      return `${btcMarketcap.toFixed(1)} BTC`;
    } else {
      return `${btcMarketcap.toFixed(3)} BTC`;
    }
  }
};

// Check if a token is active based on price and last activity
export const isTokenActive = (token: Token): boolean => {
  // Calculate price in sats if not already done
  if (!token.price_in_sats) {
    token.price_in_sats = convertPriceToSats(token.price);
  }
  
  // Calculate price change percentage if price_1d is available
  if (token.price_1d && token.price_1d > 0) {
    const currentPrice = token.price;
    const previousPrice = token.price_1d;
    token.price_change_24h = ((currentPrice - previousPrice) / previousPrice) * 100;
  } else {
    token.price_change_24h = 0;
  }
  
  const priceInSats = token.price_in_sats;
  const lastActionDate = new Date(token.last_action_time);
  const eightDaysAgo = new Date();
  eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
  
  // Token is active if price >= 0.15 sats AND it has activity in the last 8 days
  const isActive = priceInSats >= 0.15 && lastActionDate > eightDaysAgo;
  
  // Set reason for inactivity
  let inactiveReason = '';
  if (!isActive) {
    if (priceInSats < 0.15) {
      inactiveReason += 'Low price';
    }
    
    if (lastActionDate <= eightDaysAgo) {
      inactiveReason += inactiveReason ? ' & ' : '';
      inactiveReason += 'No recent activity';
    }
  }
  
  // Update token with activity status
  token.is_active = isActive;
  token.inactive_reason = isActive ? '' : inactiveReason;
  
  return isActive;
};

// Fetch token data by ID
export const getToken = async (tokenId: string): Promise<Token> => {
  try {
    // Use proxy server
    const response = await axios.get(`${PROXY_BASE_URL}/token/${tokenId}`);
    const token = response.data;
    token.price_in_sats = convertPriceToSats(token.price);
    isTokenActive(token); // Check and set activity status
    
    return token;
  } catch (error) {
    console.error('Error fetching token:', error);
    
    // Fallback to cache if proxy server fails
    const redisKey = `${REDIS_TOKEN_KEY}_${tokenId}`;
    const redisData = await getFromRedis<Token>(redisKey);
    if (redisData) {
      console.log(`Proxy failed, using cached token data as fallback for ${tokenId}`);
      return redisData;
    }
    
    throw error;
  }
};

// Fetch user data by principal
export const getUser = async (principal: string): Promise<User> => {
  try {
    // Use proxy server
    const response = await axios.get(`${PROXY_BASE_URL}/user/${principal}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

// Fetch recent trades for a token
export const getTokenTrades = async (tokenId: string, limit = 50): Promise<Trade[]> => {
  try {
    // Use proxy server
    const response = await axios.get(`${PROXY_BASE_URL}/token/${tokenId}/trades`, {
      params: { limit }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching token trades:', error);
    return [];
  }
};

// Fetch top tokens by marketcap
export const getTopTokens = async (limit = 30, sort = 'marketcap'): Promise<Token[]> => {
  try {
    // Use proxy server
    const response = await axios.get(`${PROXY_BASE_URL}/tokens`, {
      params: { limit, sort }
    });
    
    const tokens = response.data.data || [];
    
    // Add price_in_sats and check activity status for each token
    return tokens.map((token: Token) => {
      token.price_in_sats = convertPriceToSats(token.price);
      isTokenActive(token);
      return token;
    });
  } catch (error) {
    console.error('Error fetching top tokens:', error);
    
    // Fallback to cache if proxy server fails
    const redisKey = `${REDIS_TOP_TOKENS_KEY}_${sort}_${limit}`;
    const redisData = await getFromRedis<Token[]>(redisKey);
    if (redisData) {
      console.log(`Proxy failed, using cached top tokens as fallback for sort=${sort}, limit=${limit}`);
      return redisData;
    }
    
    return [];
  }
};

// Fetch tokens created by a specific creator
export const getCreatorTokens = async (principal: string, limit = 20): Promise<Token[]> => {
  try {
    // Use proxy server
    const response = await axios.get(`${PROXY_BASE_URL}/creator/${principal}/tokens`, {
      params: { limit }
    });
    
    const tokens = response.data.data || [];
    
    // Add price_in_sats and check activity status for each token
    return tokens.map((token: Token) => {
      token.price_in_sats = convertPriceToSats(token.price);
      isTokenActive(token);
      return token;
    });
  } catch (error) {
    console.error('Error fetching creator tokens:', error);
    
    // Fallback to cache if proxy server fails
    const redisKey = `${REDIS_CREATOR_TOKENS_KEY}_${principal}_${limit}`;
    const redisData = await getFromRedis<Token[]>(redisKey);
    if (redisData) {
      console.log(`Proxy failed, using cached creator tokens as fallback for ${principal}`);
      return redisData;
    }
    
    return [];
  }
};

// Calculate performance metrics for a token creator
export const calculateCreatorPerformance = async (principal: string): Promise<CreatorPerformance | null> => {
  try {
    const user = await getUser(principal);
    const tokens = await getCreatorTokens(principal);
    
    if (!user || tokens.length === 0) {
      return null;
    }
    
    // Debug price values
    console.log('Token prices for creator:', principal);
    tokens.forEach(token => {
      const priceInSats = token.price_in_sats || token.price / 1000;
      console.log(`Token ${token.name} (${token.id}): raw price = ${token.price}, in sats = ${priceInSats.toFixed(3)}, active = ${token.is_active}`);
    });
    
    let totalVolume = 0;
    let activeTokens = 0;
    let totalHolders = 0;
    let totalTrades = 0;
    
    tokens.forEach(token => {
      if (token.volume > 0) {
        totalVolume += token.volume;
      }
      
      if (token.is_active) {
        activeTokens++;
      }
      
      totalHolders += token.holder_count || 0;
      totalTrades += (token.buy_count || 0) + (token.sell_count || 0);
    });
    
    // Calculate success rate based on active tokens
    const successRate = tokens.length > 0 ? (activeTokens / tokens.length) * 100 : 0;
    
    // Calculate weighted score (combines volume and active tokens)
    const volumeWeight = 0.6;
    const activeTokenWeight = 0.4;
    
    // Normalize volume
    const maxVolume = Math.max(...tokens.map(t => t.volume || 1));
    const normalizedVolume = totalVolume / (maxVolume || 1);
    
    // Normalize active tokens ratio
    const normalizedActiveTokens = tokens.length > 0 ? activeTokens / tokens.length : 0;
    
    // Calculate weighted score
    const weightedScore = (normalizedVolume * volumeWeight) + (normalizedActiveTokens * activeTokenWeight);
    
    // Calculate confidence score (0-100) with different weights for each factor
    // Success rate is most important, followed by volume, holders, and trades
    const successWeight = 0.70;  // 70% weight for success rate
    const volumeWeight2 = 0.20;  // 20% weight for volume
    const holdersWeight = 0.08;  // 8% weight for holders
    const tradesWeight = 0.02;   // 2% weight for trades
    
    // Calculate individual scores
    const successScore = Math.min(100, successRate);
    
    // Volume score - logarithmic scale to handle wide range of volumes
    // 1B sats (10 BTC) would be a perfect score
    const volumeScore = Math.min(100, Math.log10(totalVolume + 1) * 10);
    
    // Holders score - logarithmic scale
    // 1000 holders would be a perfect score
    const holdersScore = Math.min(100, Math.log10(totalHolders + 1) * 33.3);
    
    // Trades score - logarithmic scale
    // 1000 trades would be a perfect score
    const tradesScore = Math.min(100, Math.log10(totalTrades + 1) * 33.3);
    
    // Calculate final confidence score without random factor
    let confidenceScore = (
      (successScore * successWeight) +
      (volumeScore * volumeWeight2) +
      (holdersScore * holdersWeight) +
      (tradesScore * tradesWeight)
    );
    
    // Cap confidence score at 100
    confidenceScore = Math.min(100, confidenceScore);
    
    // Find the most recently created token
    const sortedByCreationTime = [...tokens].sort((a, b) => 
      new Date(b.created_time).getTime() - new Date(a.created_time).getTime()
    );
    const lastTokenCreated = sortedByCreationTime.length > 0 ? sortedByCreationTime[0].created_time : undefined;
    
    // Calculate BTC volume for display (divide by 1000 to get correct value)
    const btcVolume = convertVolumeToBTC(totalVolume) / 1000;
    
    // Log the confidence score components for debugging
    console.log(`Confidence score for ${user.username}:`, {
      successScore: successScore.toFixed(2),
      volumeScore: volumeScore.toFixed(2),
      holdersScore: holdersScore.toFixed(2),
      tradesScore: tradesScore.toFixed(2),
      finalScore: confidenceScore.toFixed(2)
    });
    
    return {
      principal,
      username: user.username,
      image: user.image,
      totalTokens: tokens.length,
      activeTokens,
      totalVolume,
      btcVolume,
      successRate,
      weightedScore,
      confidenceScore,
      totalHolders,
      totalTrades,
      lastTokenCreated,
      tokens: tokens.sort((a, b) => {
        const priceA = a.price_in_sats || a.price / 1000;
        const priceB = b.price_in_sats || b.price / 1000;
        return priceB - priceA;
      }).slice(0, 25)
    };
  } catch (error) {
    console.error('Error calculating creator performance:', error);
    return null;
  }
};

// Get user balances
export const getUserBalances = async (principal: string): Promise<any> => {
  try {
    // Use proxy server
    const response = await axios.get(`${PROXY_BASE_URL}/user/${principal}/balances`, {
      params: {
        lp: true,
        limit: 999999
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching user balances:', error);
    return null;
  }
};

// Sort options for creators
export type CreatorSortOption = 'volume' | 'active' | 'weighted' | 'confidence' | 'success' | 'tokens' | 'holders';

// Session storage key for creators cache
const CREATORS_CACHE_KEY = 'forseti_creators_cache';
const CREATORS_CACHE_TIMESTAMP_KEY = 'forseti_creators_cache_timestamp';
const CACHE_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes in milliseconds
const REDIS_CACHE_KEY = 'dev_tracker_creators_data';

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

// Find top creators based on their token performance
export const findTopCreators = async (
  limit = 200, 
  sortBy: CreatorSortOption = 'confidence'
): Promise<CreatorPerformance[]> => {
  try {
    // Try to get data from cache
    const redisData = await getFromRedis<CreatorPerformance[]>(REDIS_CACHE_KEY);
    
    if (redisData) {
      console.log('Using cached creators data');
      return sortCreatorsData(redisData, sortBy, limit);
    }
    
    // If no valid cache, fetch fresh data through the proxy
    console.log('Fetching creators data through topTokens');
    
    // We'll get top tokens first through the proxy
    const topTokens = await getTopTokens(200);
    console.log(`Fetched ${topTokens.length} top tokens by marketcap`);
    
    // Extract unique creator principals
    const creatorSet = new Set<string>();
    topTokens.forEach((token: Token) => {
      if (token.creator && typeof token.creator === 'string') {
        creatorSet.add(token.creator);
      }
    });
    
    const creatorPrincipals = Array.from(creatorSet);
    console.log(`Found ${creatorPrincipals.length} unique creators from top tokens`);
    
    // Calculate performance for each creator
    const performancePromises = creatorPrincipals.map(principal => calculateCreatorPerformance(principal));
    
    const performances = await Promise.all(performancePromises);
    const validPerformances = performances.filter((perf): perf is CreatorPerformance => perf !== null);
    
    console.log(`Successfully calculated performance for ${validPerformances.length} creators`);
    
    // Cache the data
    try {
      await setInRedis(REDIS_CACHE_KEY, validPerformances, CACHE_EXPIRY_TIME / 1000);
      console.log('Successfully cached creators data');
    } catch (error) {
      console.error('Failed to cache creators data:', error);
    }
    
    // Sort and return the data
    return sortCreatorsData(validPerformances, sortBy, limit);
  } catch (error) {
    console.error('Error finding top creators:', error);
    
    // Try to use cached data even if expired
    const redisData = await getFromRedis<CreatorPerformance[]>(REDIS_CACHE_KEY);
    if (redisData) {
      console.log('Error in processing, using cached creators data as fallback');
      return sortCreatorsData(redisData, sortBy, limit);
    }
    
    return [];
  }
};

// Helper function to sort creators data
const sortCreatorsData = (
  creators: CreatorPerformance[], 
  sortBy: CreatorSortOption, 
  limit: number
): CreatorPerformance[] => {
  // Sort based on selected criteria
  let sortedPerformances: CreatorPerformance[];
  switch (sortBy) {
    case 'volume':
      sortedPerformances = creators.sort((a, b) => b.totalVolume - a.totalVolume);
      break;
    case 'active':
      sortedPerformances = creators.sort((a, b) => b.activeTokens - a.activeTokens);
      break;
    case 'weighted':
      sortedPerformances = creators.sort((a, b) => b.weightedScore - a.weightedScore);
      break;
    case 'confidence':
      sortedPerformances = creators.sort((a, b) => b.confidenceScore - a.confidenceScore);
      break;
    case 'success':
      sortedPerformances = creators.sort((a, b) => b.successRate - a.successRate);
      break;
    case 'tokens':
      sortedPerformances = creators.sort((a, b) => b.totalTokens - a.totalTokens);
      break;
    case 'holders':
      sortedPerformances = creators.sort((a, b) => {
        const aHolders = a.totalHolders || 0;
        const bHolders = b.totalHolders || 0;
        return bHolders - aHolders;
      });
      break;
    default:
      sortedPerformances = creators.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }
  
  // Add ranking and calculate total holders
  return sortedPerformances.slice(0, limit).map((perf, index) => ({
    ...perf,
    rank: index + 1,
    totalHolders: perf.totalHolders || perf.tokens.reduce((sum, t) => sum + t.holder_count, 0)
  }));
};

// Get tokens from followed creators
export const getFollowedCreatorsTokens = async (creatorPrincipals: string[]): Promise<Token[]> => {
  if (creatorPrincipals.length === 0) {
    return [];
  }
  
  try {
    const tokenPromises = creatorPrincipals.map(principal => getCreatorTokens(principal, 5));
    const creatorTokensArrays = await Promise.all(tokenPromises);
    
    // Flatten the array and sort by creation time (most recent first)
    const allTokens = creatorTokensArrays
      .flat()
      .sort((a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime());
    
    // Remove duplicates (in case multiple followed creators have the same token)
    const uniqueTokens = Array.from(
      new Map(allTokens.map(token => [token.id, token])).values()
    );
    
    return uniqueTokens;
  } catch (error) {
    console.error('Error fetching followed creators tokens:', error);
    return [];
  }
};

// Get rarity level based on confidence score
export const getRarityLevel = (score: number): string => {
  if (score >= 100) return 'legendary';   // Gold - only perfect 100%
  if (score >= 90) return 'epic';         // Purple
  if (score >= 80) return 'great';        // Blue
  if (score >= 70) return 'okay';         // Green
  if (score >= 60) return 'neutral';      // White
  if (score >= 45) return 'meh';          // Gray
  if (score >= 30) return 'scam';         // Brown
  return 'scam';                          // Red
};

// Get trades for a specific user
export const getUserTrades = async (principal: string, limit = 10): Promise<Trade[]> => {
  try {
    const response = await retryApiCall(() => 
      axios.get(`${API_BASE_URL}/trades?user=${principal}&limit=${limit}`)
    );
    return response.data.data || [];
  } catch (error) {
    console.error(`Error fetching trades for user ${principal}:`, error);
    return [];
  }
};

// Find top traders based on performance metrics
export const findTopTraders = async (limit = 10): Promise<TraderPerformance[]> => {
  try {
    // For now, we'll use the top creators as traders
    const topCreators = await findTopCreators(limit);
    
    // Convert creators to traders format
    return topCreators.map(creator => ({
      principal: creator.principal,
      username: creator.username,
      image: creator.image,
      totalTokens: creator.totalTokens,
      activeTokens: creator.activeTokens,
      successRate: creator.successRate,
      totalVolume: creator.totalVolume,
      confidenceScore: creator.confidenceScore,
      recentTokens: creator.tokens.slice(0, 3).map(token => token.id)
    }));
  } catch (error) {
    console.error('Error finding top traders:', error);
    return [];
  }
};

// Fetch recently launched tokens with shorter cache time
export const getRecentlyLaunchedTokens = async (limit = 20): Promise<Token[]> => {
  try {
    // Use dedicated endpoint with short cache time
    const response = await axios.get(`${PROXY_BASE_URL}/recent-tokens`, {
      params: { limit }
    });
    
    const tokens = response.data.data || [];
    
    // Add price_in_sats and check activity status for each token
    return tokens.map((token: Token) => {
      token.price_in_sats = convertPriceToSats(token.price);
      isTokenActive(token);
      return token;
    });
  } catch (error) {
    console.error('Error fetching recently launched tokens:', error);
    
    // Fallback to direct API call if proxy fails
    try {
      const response = await axios.get(`${API_BASE_URL}/tokens?sort=created_time%3Adesc&page=1&limit=${limit}`);
      const tokens = response.data.data || [];
      
      return tokens.map((token: Token) => {
        token.price_in_sats = convertPriceToSats(token.price);
        isTokenActive(token);
        return token;
      });
    } catch (directError) {
      console.error('Direct API fallback failed:', directError);
      return [];
    }
  }
}; 