import axios from 'axios';
// Use the proxy server
const PROXY_BASE_URL = '/api';
const API_BASE_URL = 'https://api.odin.fun/v1';
// Redis cache helpers


// Get data from cache
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const response = await axios.get(`${PROXY_BASE_URL}/cache/${key}`);
    if (response.data && response.data.data) {
      return response.data.data as T;
    }
    return null;
  } catch (error) {
    console.error(`Error getting data from cache for key ${key}:`, error);
    return null;
  }
}

// Set data in cache
export async function setInCache(key: string, data: any, ttl: number = 3600): Promise<boolean> {
  try {
    const response = await axios.post(`${PROXY_BASE_URL}/cache/${key}`, {
      data,
      ttl
    });
    return response.status === 200;
  } catch (error) {
    console.error(`Error setting data in cache for key ${key}:`, error);
    return false;
  }
}



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
  // Raw volume is in sats, divide by 10^8 to get BTC and by 1000 for correct scaling
  return volume / 100000000 / 1000;
};

// Convert raw marketcap to BTC
export const convertMarketcapToBTC = (marketcap: number): number => {
  // Raw marketcap is in sats, divide by 10^8 to get BTC and by 1000 for correct scaling
  return marketcap / 100000000 / 1000;
};

// Get current BTC price in USD
export const getBTCPrice = async (): Promise<number> => {
  // Return a fixed value instead of calling an external API
  return 88888;
};

// Convert BTC volume to USD
export const convertBTCToUSD = async (btcAmount: number): Promise<number> => {
  const btcPrice = await getBTCPrice();
  return btcAmount * (btcPrice || 88888); // Use 88888 as fallback
};

// Format volume for display
export const formatVolume = (volume: number, inUSD = false): string => {
  const btcVolume = convertVolumeToBTC(volume); // Already includes division by 1000
  
  if (inUSD) {
    // For USD display
    const usdValue = btcVolume * 88888; // Use fallback BTC price
    
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
      return `${btcVolume.toFixed(2)} BTC`;
    } else if (btcVolume >= 0.001) {
      return `${btcVolume.toFixed(5)} BTC`;
    } else {
      return `${(btcVolume * 100000000).toFixed(0)} sats`;
    }
  }
};

// Format marketcap for display
export const formatMarketcap = (marketcap: number, inUSD = false): string => {
  const btcMarketcap = convertMarketcapToBTC(marketcap); // Already includes division by 1000
  
  if (inUSD) {
    // For USD display
    const usdValue = btcMarketcap * 88888; // Use fallback BTC price
    
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
      return `${btcMarketcap.toFixed(2)} BTC`;
    } else if (btcMarketcap >= 0.001) {
      return `${btcMarketcap.toFixed(5)} BTC`;
    } else {
      return `${(btcMarketcap * 100000000).toFixed(0)} sats`;
    }
  }
};

// Format token volume display
export const formatTokenVolumeDisplay = (volume: number, showUSD = false, usdPrice = 88888): string => {
  if (showUSD) {
    // Diviser par 1000 une fois de plus pour obtenir la valeur correcte
    const btcVolume = volume / 100000000 / 1000; // Déjà inclus dans convertVolumeToBTC
    const usdVolume = btcVolume * usdPrice;
    
    if (usdVolume >= 1000000) {
      return `$${(usdVolume / 1000000).toFixed(1)}M`;
    } else if (usdVolume >= 1000) {
      return `$${(usdVolume / 1000).toFixed(1)}K`;
    } else {
      return `$${usdVolume.toFixed(0)}`;
    }
  } else {
    return formatVolume(volume, false);
  }
};

// Format token marketcap display
export const formatTokenMarketcapDisplay = (marketcap: number, showUSD = false, usdPrice = 88888): string => {
  if (showUSD) {
    // Diviser par 1000 une fois de plus pour obtenir la valeur correcte
    const btcMarketcap = marketcap / 100000000 / 1000; // Déjà inclus dans convertMarketcapToBTC
    const usdMarketcap = btcMarketcap * usdPrice;
    
    if (usdMarketcap >= 1000000) {
      return `$${(usdMarketcap / 1000000).toFixed(1)}M`;
    } else if (usdMarketcap >= 1000) {
      return `$${(usdMarketcap / 1000).toFixed(1)}K`;
    } else {
      return `$${usdMarketcap.toFixed(0)}`;
    }
  } else {
    return formatMarketcap(marketcap, false);
  }
};

// Determine if a token is active based on price and other factors
export const isTokenActive = (token: Token): boolean => {
  // Check if token is priced too low
  const inactiveThreshold = 0.25; // 0.25 sats per token
  
  // Set is_active property
  if (token.price <= 0 || !token.trading) {
    token.is_active = false;
    token.inactive_reason = token.price <= 0 
      ? 'Zero price' 
      : 'Trading disabled';
    return false;
  }
  
  // Calculate hours since creation
  const createdDate = new Date(token.created_time);
  const now = new Date();
  const hoursSinceCreation = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
  
  // Check if token price is below threshold and token is older than 1 hour
  if (token.price_in_sats !== undefined && token.price_in_sats < inactiveThreshold && hoursSinceCreation > 1) {
    token.is_active = false;
    token.inactive_reason = 'Price too low';
    return false;
  }
  
  // Check if token has trading activity based on days since creation
  const daysSinceCreation = hoursSinceCreation / 24;
  if (daysSinceCreation > 2 && token.volume < 0.00001) {
    token.is_active = false;
    token.inactive_reason = 'No trading activity';
    return false;
  }
  
  // Token is active if it passed all checks
  token.is_active = true;
  token.inactive_reason = '';
  return true;
};

// Process tokens by adding sats price and activity status
export const processTokens = (tokens: Token[]): Token[] => {
  return tokens.map(token => {
    // Add price in sats if not already present
    if (typeof token.price === 'number' && token.price_in_sats === undefined) {
      token.price_in_sats = convertPriceToSats(token.price);
    }
    
    // Add price change 24h if not already present
    if (token.price_change_24h === undefined) {
      // Générer une valeur simulée entre -15% et +25%
      // Ceci est temporaire jusqu'à ce que l'API fournisse les vraies données
      token.price_change_24h = Math.round((Math.random() * 40 - 15) * 100) / 100;
    }
    
    // Check token activity status
    isTokenActive(token);
    
    return token;
  });
};

// Get individual token by ID
export const getToken = async (tokenId: string): Promise<Token> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/token/${tokenId}`);
    const token = response.data;
    
    // Process token data using our processTokens function to ensure all fields are set
    if (token) {
      return processTokens([token])[0];
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
    const response = await axios.get(`${PROXY_BASE_URL}/user/${principal}`);
    const user = response.data;
    
    return user;
  } catch (error) {
    console.error(`Error fetching user ${principal}:`, error);
    throw new Error(`User not found: ${principal}`);
  }
};

// Fetch recent trades for a token
export const getTokenTrades = async (tokenId: string, limit = 50): Promise<Trade[]> => {
  try {
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
    const response = await axios.get(`${PROXY_BASE_URL}/tokens`, {
      params: { limit, sort }
    });
    
    const tokens = response.data.data || [];
    
    // Process tokens to ensure all fields are properly set
    return processTokens(tokens);
  } catch (error) {
    console.error('Error fetching top tokens:', error);
    return [];
  }
};

// Fetch tokens created by a specific creator
export const getCreatorTokens = async (principal: string, limit = 20, forceRefresh = false): Promise<Token[]> => {
  try {
    const cacheParam = forceRefresh ? `?_t=${Date.now()}` : '';
    const response = await axios.get(`${PROXY_BASE_URL}/creator/${principal}/tokens${cacheParam}`, {
      params: { limit }
    });
    
    const tokens = response.data.data || [];
    
    // Process tokens to ensure all fields are properly set
    return processTokens(tokens);
  } catch (error) {
    console.error('Error fetching creator tokens:', error);
    return [];
  }
};

// Calculate generated marketcap (total marketcap minus base minting cost of 0.025 BTC per token)
export const calculateGeneratedMarketcap = (marketcap: number, tokenCount: number): number => {
  // Le marketcap est déjà en BTC à ce stade (divisé par 100M et 1000)
  // Le coût de base est de 0.025 BTC par token
  const baseCostPerToken = 0.025; // En BTC directement
  const totalBaseCost = baseCostPerToken * tokenCount;
  
  return Math.max(0, marketcap - totalBaseCost);
};

// Convert to USD
export const convertToUSD = (btcAmount: number): number => {
  // Use fixed BTC price value
  return btcAmount * 88888;
};

// Calculate performance metrics for a token creator
export const calculateCreatorPerformance = async (
  principal: string,
  forceRefresh = false
): Promise<CreatorPerformance | null> => {
  try {
    // If forcing refresh or no cache, calculate fresh performance
    const user = await getUser(principal);
    // Pass forceRefresh to getCreatorTokens to ensure we get fresh data
    const tokens = await getCreatorTokens(principal, 25, forceRefresh);
    
    if (!user || tokens.length === 0) {
      return null;
    }
    
    let totalVolume = 0;
    let activeTokens = 0;
    let totalHolders = 0;
    let totalTrades = 0;
    let totalMarketcap = 0;
    
    // Base marketcap per token (0.025 BTC)
    const baseBtcMarketcapPerToken = 0.025;
    const defaultBtcPrice = 88888; // Default BTC price in USD
    const btcPrice = await getBTCPrice() || defaultBtcPrice;
    
    tokens.forEach(token => {
      if (token.volume > 0) {
        totalVolume += token.volume;
      }
      
      if (token.is_active) {
        activeTokens++;
      }
      
      totalHolders += token.holder_count || 0;
      totalTrades += (token.buy_count || 0) + (token.sell_count || 0);
      
      // Ajouter la marketcap du token (convertie en BTC)
      const tokenMarketcapInBtc = token.marketcap / 100000000 / 1000;
      totalMarketcap += tokenMarketcapInBtc;
    });
    
    // Calculate success rate based on active tokens
    const successRate = tokens.length > 0 ? (activeTokens / tokens.length) * 100 : 0;
    
    // Constantes pour les poids du score final
    const successWeight = 0.33;  // 33% weight for success rate
    const volumeWeight = 0.33;   // 33% weight for volume
    const holdersWeight = 0.15;  // 15% weight for holders
    const tradesWeight = 0.01;   // 1% weight for trades
    const mcapWeight = 0.18;     // 18% weight for generated marketcap
    
    // 1. Volume score: linear scale based on BTC volume in USD
    // For volume: $0 = 0 points, $600,000 = 100 points (linear scale)
    const maxVolumeUSD = 600000; // $600K for maximum score
    const volumeInUSD = totalVolume / 100000000 * btcPrice;
    const volumeScore = Math.min(100, (volumeInUSD / maxVolumeUSD) * 100);
    
    // 2. Holders score: linear scale based on total holder count
    // For holders: 0 = 0 points, 600 = 100 points (linear scale)
    const maxHolders = 600; // 600 holders for maximum score
    const holdersScore = Math.min(100, (totalHolders / maxHolders) * 100);
    
    // 3. Trades score: linear scale based on total transaction count
    // For trades: 0 = 0 points, 6000 = 100 points (linear scale)
    const maxTrades = 6000; // 6000 transactions for maximum score
    const tradesScore = Math.min(100, (totalTrades / maxTrades) * 100);
    
    // 4. Generated marketcap score: difference between total marketcap and base (0.025 BTC per token)
    const baseMarketcap = tokens.length * baseBtcMarketcapPerToken;
    const generatedMarketcap = Math.max(0, totalMarketcap - baseMarketcap);
    
    // Conversion to USD for logging
    const generatedMarketcapUSD = generatedMarketcap * btcPrice;
    
    // 5. Marketcap score: linear scale based on generated marketcap over threshold
    // For marketcap: $0 = 0 points, $100,000 = 100 points (linear scale)
    const maxMarketcapUSD = 100000; // $100K for maximum score
    const mcapScore = Math.min(100, (generatedMarketcapUSD / maxMarketcapUSD) * 100);
    
    // 6. Success rate with penalty for inactive tokens
    let successScore = 0;
    if (tokens.length > 0) {
      // Base success rate (active/total percentage)
      const baseSuccessRate = (activeTokens / tokens.length) * 100;
      
      // Bonus/Penalty system:
      // Each active token gives +6 bonus points (increased to favor more active tokens)
      // Each inactive token gives a penalty that starts at -2 and increases by -0.5 for each additional token
      // For example: 2 inactive tokens = -2 + (-2-0.5) = -4.5 penalty
      const activeBonus = activeTokens * 6;
      
      let inactivePenalty = 0;
      const inactiveTokens = tokens.length - activeTokens;
      for (let i = 0; i < inactiveTokens; i++) {
        inactivePenalty += 2 + (i * 0.5);
      }
      
      // Calculate net bonus/penalty effect
      const netEffect = activeBonus - inactivePenalty;
      
      // Apply to base success rate, but never below 0
      successScore = Math.max(0, baseSuccessRate + netEffect);
      
      // Cap at 100 maximum
      successScore = Math.min(100, successScore);
      
      // If no active tokens, use a more generous score based on token count
      if (activeTokens === 0) {
        // Start at 3 points for 0/1 and decrease by 0.5 per token
        successScore = Math.max(0.5, 3 - (tokens.length * 0.5));
      }
    }
    
    // Calculate weighted confidence score based on various metrics
    const confidenceScore = Math.min(100, Math.max(0,
      (successScore * successWeight) +
      (volumeScore * volumeWeight) +
      (holdersScore * holdersWeight) +
      (tradesScore * tradesWeight) +
      (mcapScore * mcapWeight)
    ));
    
    // Find the most recently created token
    const sortedByCreationTime = [...tokens].sort((a, b) => 
      new Date(b.created_time).getTime() - new Date(a.created_time).getTime()
    );
    const lastTokenCreated = sortedByCreationTime.length > 0 ? sortedByCreationTime[0].created_time : undefined;
    
    // Calculate BTC volume for display
    const btcVolume = convertVolumeToBTC(totalVolume);
    
    const performance: CreatorPerformance = {
      principal,
      username: user.username,
      image: user.image,
      totalTokens: tokens.length,
      activeTokens,
      totalVolume,
      btcVolume,
      successRate,
      weightedScore: confidenceScore, // Keep weightedScore for compatibility
      confidenceScore,
      totalHolders,
      totalTrades,
      lastTokenCreated: lastTokenCreated || '',
      totalMarketcap,
      generatedMarketcapBTC: generatedMarketcap,
      generatedMarketcapUSD: generatedMarketcapUSD,
      rank: 0, // Will be set later
      tokens: tokens.sort((a, b) => {
        const priceA = a.price_in_sats || a.price / 1000;
        const priceB = b.price_in_sats || b.price / 1000;
        return priceB - priceA;
      }).slice(0, 25)
    };
    
    return performance;
  } catch (error) {
    console.error(`Error calculating performance for creator ${principal}:`, error);
    return null;
  }
};

// Sort options for creators
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

// Find top creators sorted by specified option
export const findTopCreators = async (
  limit = 100, 
  sortBy: CreatorSortOption = 'confidence', 
  forceRefresh = false,
  tokensLimit = 125 // Nouveau paramètre pour récupérer plus de tokens
): Promise<CreatorPerformance[]> => {
  try {
    console.log(`Finding top ${limit} creators sorted by ${sortBy} (fetching ${tokensLimit} tokens first)`);
    
    // Get top tokens by marketcap
    const topTokens = await getTopTokens(tokensLimit);
    
    // Extract unique creator IDs
    const uniqueCreatorIds = new Set<string>();
    topTokens.forEach(token => {
      if (token.creator) {
        uniqueCreatorIds.add(token.creator);
      }
    });
    
    console.log(`Found ${uniqueCreatorIds.size} unique creators from ${topTokens.length} tokens`);
    
    // Get performance data for each creator
    const creators: CreatorPerformance[] = [];
    const promises: Promise<CreatorPerformance | null>[] = [];
    
    uniqueCreatorIds.forEach(creatorId => {
      promises.push(calculateCreatorPerformance(creatorId, forceRefresh));
    });
    
    const results = await Promise.all(promises);
    
    // Filter out null results and creators with no username
    results.forEach(result => {
      if (result && result.username) {
        creators.push(result);
      }
    });
    
    // Sort creators by the specified option
    let sortedCreators = [...creators];
    
    sortedCreators.sort((a, b) => {
      switch (sortBy) {
        case 'tokens':
          return b.totalTokens - a.totalTokens;
        case 'active':
          return b.activeTokens - a.activeTokens;
        case 'volume':
          return b.totalVolume - a.totalVolume;
        case 'success':
          return b.successRate - a.successRate;
        case 'weighted':
          return b.weightedScore - a.weightedScore;
        case 'confidence':
          // Sort by confidence score first
          const confidenceDiff = b.confidenceScore - a.confidenceScore;
          // If confidence scores are equal, sort by marketcap as secondary criterion
          if (confidenceDiff === 0) {
            return b.totalMarketcap - a.totalMarketcap;
          }
          return confidenceDiff;
        case 'holders':
          const aHolders = a.totalHolders || 0;
          const bHolders = b.totalHolders || 0;
          return bHolders - aHolders;
        default:
          return b.confidenceScore - a.confidenceScore;
      }
    });
    
    // Limit to requested number
    sortedCreators = sortedCreators.slice(0, limit);
    
    // Add rank to each creator
    sortedCreators = sortedCreators.map((creator, index) => ({
      ...creator,
      rank: index + 1
    }));
    
    console.log(`Returning ${sortedCreators.length} sorted creators`);
    return sortedCreators;
  } catch (error) {
    console.error('Error finding top creators:', error);
    return [];
  }
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
  if (score >= 45) return 'meh';          // Dark Orange (amber-600)
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

// Fetch the 4 newest tokens with a short cache time
export const getNewestTokens = async (): Promise<Token[]> => {
  try {
    // Add a timestamp to bust any proxy caching
    const timestamp = Date.now();
    // Use dedicated endpoint with very short cache time
    const response = await axios.get(`${PROXY_BASE_URL}/newest-tokens?_t=${timestamp}`);
    
    const tokens = response.data.data || [];
    
    // Process tokens using the common processTokens function
    return processTokens(tokens);
  } catch (error) {
    console.error('Error fetching newest tokens:', error);
    
    // Fallback to direct API call if proxy fails
    try {
      const timestamp = Date.now()
      const response = await axios.get(`${API_BASE_URL}/tokens?sort=created_time%3Adesc&page=1&limit=4&_t=${timestamp}`);
      const tokens = response.data.data || [];
      
      // Process tokens using the common processTokens function
      return processTokens(tokens);
    } catch (directError) {
      console.error('Direct API fallback failed:', directError);
      return [];
    }
  }
};

// Fetch older recent tokens (5-30) with a longer cache time
export const getOlderRecentTokens = async (limit = 26, offset = 4): Promise<Token[]> => {
  try {
    // Add a timestamp to bust any proxy caching
    const timestamp = Date.now();
    // Use dedicated endpoint with longer cache time, explicitly specifying the offset
    const response = await axios.get(`${PROXY_BASE_URL}/older-recent-tokens?_t=${timestamp}`, {
      params: { limit, offset }
    });
    
    const tokens = response.data.data || [];
    console.log(`Fetched ${tokens.length} older tokens from API with offset ${offset}`);
    
    // Process tokens using the common processTokens function
    return processTokens(tokens);
  } catch (error) {
    console.error('Error fetching older recent tokens:', error);
    
    // Fallback to direct API call if proxy fails
    try {
      const timestamp = Date.now()
      // In fallback, if offset is provided, we need to get tokens from the second page
      // and adjust the limit and offset accordingly
      const page = Math.ceil((offset + 1) / 20); // Calculate page number based on offset
      const pageOffset = offset % 20; // Calculate offset within the page
      
      const response = await axios.get(`${API_BASE_URL}/tokens?sort=created_time%3Adesc&page=${page}&limit=${limit}&offset=${pageOffset}&_t=${timestamp}`);
      const tokens = response.data.data || [];
      console.log(`Fetched ${tokens.length} older tokens from direct API call (fallback) with offset ${offset}, page ${page}`);
      
      // Process tokens using the common processTokens function
      return processTokens(tokens);
    } catch (directError) {
      console.error('Direct API fallback failed:', directError);
      return [];
    }
  }
};

// Get fresh token holder data
export const getTokenHolderData = async (tokenId: string): Promise<{ 
  holder_count: number, 
  holder_top: number, 
  holder_dev: number 
}> => {
  try {
    // Add timestamp to bust any proxy caching
    const timestamp = Date.now()
    // Use dedicated endpoint with short cache time
    const response = await axios.get(`${PROXY_BASE_URL}/token/${tokenId}/holders?_t=${timestamp}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching token holder data for ${tokenId}:`, error);
    
    // Fallback to regular token endpoint if holder endpoint fails
    try {
      const tokenData = await getToken(tokenId);
      return {
        holder_count: tokenData.holder_count,
        holder_top: tokenData.holder_top,
        holder_dev: tokenData.holder_dev
      };
    } catch (fallbackError) {
      console.error('Fallback fetch failed:', fallbackError);
      return {
        holder_count: 0,
        holder_top: 0,
        holder_dev: 0
      };
    }
  }
};

// API function to convert tokens to creator performance data
export const processTokensIntoCreators = async (tokens: Token[]): Promise<CreatorPerformance[]> => {
  try {
    // Extract unique creator IDs
    const uniqueCreatorIds = new Set<string>();
    tokens.forEach(token => {
      if (token.creator) {
        uniqueCreatorIds.add(token.creator);
      }
    });
    
    console.log(`Processing ${uniqueCreatorIds.size} unique creators from ${tokens.length} cached tokens`);
    
    // Group tokens by creator
    const creatorTokensMap = new Map<string, Token[]>();
    tokens.forEach(token => {
      if (token.creator) {
        if (!creatorTokensMap.has(token.creator)) {
          creatorTokensMap.set(token.creator, []);
        }
        creatorTokensMap.get(token.creator)?.push(token);
      }
    });
    
    // Get user info for each creator
    const creatorInfoPromises = Array.from(uniqueCreatorIds).map(async (principal) => {
      try {
        const user = await getUser(principal);
        return { principal, user };
      } catch (error) {
        console.error(`Error fetching user info for ${principal}:`, error);
        return null;
      }
    });
    
    const creatorInfoResults = await Promise.all(creatorInfoPromises);
    
    // Build creator performance data
    const creators: CreatorPerformance[] = [];
    
    for (const creatorInfo of creatorInfoResults) {
      if (!creatorInfo || !creatorInfo.user || !creatorInfo.user.username) continue;
      
      const { principal, user } = creatorInfo;
      const creatorTokens = creatorTokensMap.get(principal) || [];
      
      if (creatorTokens.length === 0) continue;
      
      // Calculate active tokens count
      const activeTokens = creatorTokens.filter(token => token.is_active !== false).length;
      
      // Calculate success rate (percentage of active tokens)
      const successRate = creatorTokens.length > 0 
        ? (activeTokens / creatorTokens.length) * 100
        : 0;
      
      // Calculate total volume
      const totalVolume = creatorTokens.reduce((sum, token) => sum + (token.volume || 0), 0);
      
      // Calculate BTC volume (convert from sats)
      const btcVolume = convertVolumeToBTC(totalVolume);
      
      // Calculate total holders (combined total of all tokens)
      const totalHolders = creatorTokens.reduce((sum, token) => sum + (token.holder_count || 0), 0);
      
      // Calculate total marketcap
      const totalMarketcap = creatorTokens.reduce((sum, token) => {
        // Convertir le marketcap en BTC
        const tokenMarketcapInBtc = token.marketcap / 100000000 / 1000;
        return sum + tokenMarketcapInBtc;
      }, 0);
      
      // Constantes pour les poids du score final
      const successWeight = 0.33;  // 33% weight for success rate
      const volumeWeight = 0.33;   // 33% weight for volume
      const holdersWeight = 0.15;  // 15% weight for holders
      const tradesWeight = 0.01;   // 1% weight for trades
      const mcapWeight = 0.18;     // 18% weight for generated marketcap
      
      // Pour les calculs en USD, utiliser une valeur fixe pour le prix BTC
      const btcPrice = 88888;
      
      // 1. Volume score: linear scale based on BTC volume in USD
      // For volume: $0 = 0 points, $600,000 = 100 points (linear scale)
      const maxVolumeUSD = 600000; // $600K for maximum score
      const volumeInUSD = totalVolume / 100000000 * btcPrice;
      const volumeScore = Math.min(100, (volumeInUSD / maxVolumeUSD) * 100);
      
      // 2. Holders score: linear scale based on total holder count
      // For holders: 0 = 0 points, 600 = 100 points (linear scale)
      const maxHolders = 600; // 600 holders for maximum score
      const holdersScore = Math.min(100, (totalHolders / maxHolders) * 100);
      
      // Calculate total number of trades
      const totalTrades = creatorTokens.reduce((sum, token) => {
        // Use txn_count if available, otherwise fallback to buy_count + sell_count
        const tokenTrades = token.txn_count || (token.buy_count + token.sell_count);
        return sum + (tokenTrades || 0);
      }, 0);
      
      // 3. Trades score: linear scale based on total transaction count
      // For trades: 0 = 0 points, 6000 = 100 points (linear scale)
      const maxTrades = 6000; // 6000 transactions for maximum score
      const tradesScore = Math.min(100, (totalTrades / maxTrades) * 100);
      
      // 4. Generated marketcap score: difference between total marketcap and base (0.025 BTC per token)
      const baseBtcMarketcapPerToken = 0.025;
      const baseMarketcap = creatorTokens.length * baseBtcMarketcapPerToken;
      const generatedMarketcap = Math.max(0, totalMarketcap - baseMarketcap);
      
      // Conversion to USD for score calculation
      const generatedMarketcapUSD = generatedMarketcap * btcPrice;
      
      // 5. Marketcap score: linear scale based on generated marketcap over threshold
      // For marketcap: $0 = 0 points, $100,000 = 100 points (linear scale)
      const maxMarketcapUSD = 100000; // $100K for maximum score
      const mcapScore = Math.min(100, (generatedMarketcapUSD / maxMarketcapUSD) * 100);
      
      // 6. Success rate with penalty for inactive tokens
      let successScore = 0;
      if (creatorTokens.length > 0) {
        // Base success rate (active/total percentage)
        const baseSuccessRate = (activeTokens / creatorTokens.length) * 100;
        
        // Bonus/Penalty system:
        // Each active token gives +6 bonus points (increased to favor more active tokens)
        // Each inactive token gives a penalty that starts at -2 and increases by -0.5 for each additional token
        // For example: 2 inactive tokens = -2 + (-2-0.5) = -4.5 penalty
        const activeBonus = activeTokens * 6;
        
        let inactivePenalty = 0;
        const inactiveTokens = creatorTokens.length - activeTokens;
        for (let i = 0; i < inactiveTokens; i++) {
          inactivePenalty += 2 + (i * 0.5);
        }
        
        // Calculate net bonus/penalty effect
        const netEffect = activeBonus - inactivePenalty;
        
        // Apply to base success rate, but never below 0
        successScore = Math.max(0, baseSuccessRate + netEffect);
        
        // Cap at 100
        successScore = Math.min(100, successScore);
        
        // If no active tokens, use a more generous score based on token count
        if (activeTokens === 0) {
          // Start at 3 points for 0/1 and decrease by 0.5 per token
          successScore = Math.max(0.5, 3 - (creatorTokens.length * 0.5));
        }
      }
      
      // Calculate weighted confidence score based on various metrics
      const confidenceScore = Math.min(100, Math.max(0,
        (successScore * successWeight) +
        (volumeScore * volumeWeight) +
        (holdersScore * holdersWeight) +
        (tradesScore * tradesWeight) +
        (mcapScore * mcapWeight)
      ));
      
      // Sort tokens by creation time (newest first) for lastTokenCreated
      const tokensByCreationTime = [...creatorTokens].sort((a, b) => {
        return new Date(b.created_time).getTime() - new Date(a.created_time).getTime();
      });
      
      // Get the newest token's creation time
      const lastTokenCreated = tokensByCreationTime.length > 0 ? tokensByCreationTime[0].created_time : '';
      
      // Create the performance object
      const performance: CreatorPerformance = {
        principal,
        username: user.username,
        image: user.image,
        totalTokens: creatorTokens.length,
        activeTokens,
        totalVolume,
        btcVolume,
        successRate,
        confidenceScore,
        weightedScore: confidenceScore, // For backward compatibility
        totalHolders,
        totalTrades,
        lastTokenCreated,
        totalMarketcap,
        generatedMarketcapBTC: generatedMarketcap,
        generatedMarketcapUSD: generatedMarketcapUSD,
        rank: 0, // Will be set later
        tokens: creatorTokens.sort((a, b) => {
          const priceA = a.price_in_sats || a.price / 1000;
          const priceB = b.price_in_sats || b.price / 1000;
          return priceB - priceA;
        }).slice(0, 25)
      };
      
      creators.push(performance);
    }
    
    // Sort by confidence score
    creators.sort((a, b) => {
      // Sort by confidence score first
      const confidenceDiff = b.confidenceScore - a.confidenceScore;
      // If equal, use marketcap as secondary criterion
      return confidenceDiff !== 0 ? confidenceDiff : b.totalMarketcap - a.totalMarketcap;
    });
    
    // Add rank to each creator
    const rankedCreators = creators.map((creator, index) => ({
      ...creator,
      rank: index + 1
    }));
    
    console.log(`Processed ${rankedCreators.length} creators with performance data`);
    return rankedCreators;
  } catch (error) {
    console.error('Error processing tokens into creators:', error);
    return [];
  }
};

// Get tokens created by a specific user, sorted by creation date
export const getUserCreatedTokens = async (principal: string, limit = 1): Promise<Token[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/user/${principal}/created`, {
      params: {
        sort: 'created_time:desc',
        page: 1,
        limit
      }
    });
    
    const tokens = response.data.data || [];
    return processTokens(tokens);
  } catch (error) {
    console.error(`Error fetching tokens created by ${principal}:`, error);
    return [];
  }
};

// Fetch specific token info from API with creation time
export const getTokenInfo = async (tokenId: string): Promise<Token | null> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/token/${tokenId}`);
    if (response.data) {
      return processTokens([response.data])[0];
    }
    return null;
  } catch (error) {
    console.error(`Error fetching token info for ${tokenId}:`, error);
    return null;
  }
}; 