import axios from 'axios';

const API_BASE_URL = 'https://api.odin.fun/v1';

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
  avgTokenAge?: number;
  highestTokenPrice?: number;
  buySellRatio?: number;
  totalMarketcap?: number;
  tokens: Token[];
  lastTokenCreated?: string;
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

// Get current BTC price in USD
export const getBTCPrice = async (): Promise<number> => {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    return response.data.bitcoin.usd;
  } catch (error) {
    console.error('Error fetching BTC price:', error);
    return 83000; // Fallback price if API fails
  }
};

// Convert BTC volume to USD
export const convertBTCToUSD = async (btcVolume: number): Promise<number> => {
  const btcPrice = await getBTCPrice();
  return btcVolume * btcPrice;
};

// Format volume for display
export const formatVolume = (volume: number): string => {
  const btcVolume = convertVolumeToBTC(volume);
  
  if (btcVolume >= 1000) {
    return `${(btcVolume / 1000).toFixed(1)}K BTC`;
  } else if (btcVolume >= 1) {
    return `${btcVolume.toFixed(1)} BTC`;
  } else if (btcVolume >= 0.001) {
    return `${btcVolume.toFixed(3)} BTC`;
  } else {
    return `${(volume / 1000000).toFixed(2)}M sats`;
  }
};

// Check if a token is active based on price and last activity
export const isTokenActive = (token: Token): boolean => {
  const priceInSats = token.price_in_sats || convertPriceToSats(token.price);
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
    const response = await axios.get(`${API_BASE_URL}/token/${tokenId}`);
    const token = response.data;
    token.price_in_sats = convertPriceToSats(token.price);
    isTokenActive(token); // Check and set activity status
    return token;
  } catch (error) {
    console.error('Error fetching token:', error);
    throw error;
  }
};

// Fetch user data by principal
export const getUser = async (principal: string): Promise<User> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/user/${principal}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

// Fetch recent trades for a token
export const getTokenTrades = async (tokenId: string, limit = 50): Promise<Trade[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/token/${tokenId}/trades?limit=${limit}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching token trades:', error);
    return [];
  }
};

// Fetch top tokens by marketcap
export const getTopTokens = async (limit = 30, sort = 'marketcap'): Promise<Token[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/tokens?sort=${sort}%3Adesc&page=1&limit=${limit}`);
    const tokens = response.data.data || [];
    
    // Add price_in_sats and check activity status for each token
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

// Fetch recently launched tokens
export const getRecentTokens = async (limit = 10): Promise<Token[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/tokens?sort=created_time&limit=${limit}`);
    const tokens = response.data.data || [];
    
    // Add price_in_sats and check activity status for each token
    return tokens.map((token: Token) => {
      token.price_in_sats = convertPriceToSats(token.price);
      isTokenActive(token);
      return token;
    });
  } catch (error) {
    console.error('Error fetching recent tokens:', error);
    return [];
  }
};

// Fetch tokens created by a specific creator
export const getCreatorTokens = async (principal: string, limit = 20): Promise<Token[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/tokens?creator=${principal}&limit=${limit}`);
    const tokens = response.data.data || [];
    
    // Add price_in_sats and check activity status for each token
    return tokens.map((token: Token) => {
      token.price_in_sats = convertPriceToSats(token.price);
      isTokenActive(token);
      return token;
    });
  } catch (error) {
    console.error('Error fetching creator tokens:', error);
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
    let totalMarketcap = 0;
    let avgTokenAge = 0;
    let highestTokenPrice = 0;
    let totalBuyCount = 0;
    let totalSellCount = 0;
    
    // Calculate token age in days
    const now = new Date();
    const tokenAges = tokens.map(token => {
      const createdDate = new Date(token.created_time);
      return (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24); // days
    });
    
    // Average token age
    avgTokenAge = tokenAges.reduce((sum, age) => sum + age, 0) / tokens.length;
    
    tokens.forEach(token => {
      if (token.volume > 0) {
        totalVolume += token.volume;
      }
      
      if (token.is_active) {
        activeTokens++;
      }
      
      totalHolders += token.holder_count || 0;
      totalBuyCount += token.buy_count || 0;
      totalSellCount += token.sell_count || 0;
      totalTrades += (token.buy_count || 0) + (token.sell_count || 0);
      totalMarketcap += token.marketcap || 0;
      
      // Track highest token price
      const tokenPrice = token.price_in_sats || convertPriceToSats(token.price);
      if (tokenPrice > highestTokenPrice) {
        highestTokenPrice = tokenPrice;
      }
    });
    
    // Calculate success rate based on active tokens
    const successRate = tokens.length > 0 ? (activeTokens / tokens.length) * 100 : 0;
    
    // Calculate buy/sell ratio (higher is better, balanced around 1.0)
    const buySellRatio = totalSellCount > 0 ? totalBuyCount / totalSellCount : totalBuyCount > 0 ? 2 : 1;
    
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
    const successWeight = 0.35;     // 35% weight for success rate
    const volumeWeight2 = 0.20;     // 20% weight for volume
    const holdersWeight = 0.15;     // 15% weight for holders
    const tradesWeight = 0.10;      // 10% weight for trades
    const ageWeight = 0.05;         // 5% weight for token age
    const marketcapWeight = 0.05;   // 5% weight for marketcap
    const priceWeight = 0.05;       // 5% weight for highest price
    const buySellWeight = 0.05;     // 5% weight for buy/sell ratio
    
    // Calculate individual scores
    const successScore = Math.min(100, successRate);
    
    // Volume score - logarithmic scale to handle wide range of volumes
    // 10B sats (100 BTC) would be a perfect score
    const volumeScore = Math.min(100, Math.log10(totalVolume + 1) * 8.33);
    
    // Holders score - logarithmic scale
    // 1000 holders would be a perfect score
    const holdersScore = Math.min(100, Math.log10(totalHolders + 1) * 33.3);
    
    // Trades score - logarithmic scale
    // 1000 trades would be a perfect score
    const tradesScore = Math.min(100, Math.log10(totalTrades + 1) * 33.3);
    
    // Age score - older is better, up to 180 days (6 months)
    const ageScore = Math.min(100, (avgTokenAge / 180) * 100);
    
    // Marketcap score - logarithmic scale
    // 10B sats (100 BTC) would be a perfect score
    const marketcapScore = Math.min(100, Math.log10(totalMarketcap + 1) * 8.33);
    
    // Price score - logarithmic scale
    // 10,000 sats would be a perfect score
    const priceScore = Math.min(100, (Math.log10(highestTokenPrice + 1) / Math.log10(10000)) * 100);
    
    // Buy/sell ratio score - balanced around 1.0 (equal buys and sells)
    // Optimal range is 0.8 to 1.2 (80% to 120%)
    const buySellScore = buySellRatio >= 0.8 && buySellRatio <= 1.2 
      ? 100 // Perfect balance
      : buySellRatio > 1.2 
        ? Math.max(0, 100 - ((buySellRatio - 1.2) * 50)) // Too many buys
        : Math.max(0, 100 - ((0.8 - buySellRatio) * 100)); // Too many sells
    
    // Calculate final confidence score and ensure it doesn't exceed 100%
    let confidenceScore = (
      (successScore * successWeight) +
      (volumeScore * volumeWeight2) +
      (holdersScore * holdersWeight) +
      (tradesScore * tradesWeight) +
      (ageScore * ageWeight) +
      (marketcapScore * marketcapWeight) +
      (priceScore * priceWeight) +
      (buySellScore * buySellWeight)
    );
    
    // Cap confidence score at 100
    confidenceScore = Math.min(100, confidenceScore);
    
    // Find the most recently created token
    const sortedByCreationTime = [...tokens].sort((a, b) => 
      new Date(b.created_time).getTime() - new Date(a.created_time).getTime()
    );
    const lastTokenCreated = sortedByCreationTime.length > 0 ? sortedByCreationTime[0].created_time : undefined;
    
    // Calculate BTC volume for display
    const btcVolume = convertVolumeToBTC(totalVolume);
    
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
      avgTokenAge,
      highestTokenPrice,
      buySellRatio,
      totalMarketcap,
      lastTokenCreated,
      tokens: tokens.sort((a, b) => {
        const priceA = a.price_in_sats || a.price / 1000;
        const priceB = b.price_in_sats || b.price / 1000;
        return priceB - priceA;
      }).slice(0, 5)
    };
  } catch (error) {
    console.error('Error calculating creator performance:', error);
    return null;
  }
};

// Get user balances
export const getUserBalances = async (principal: string): Promise<any> => {
  try {
    const timestamp = new Date().toISOString();
    const response = await axios.get(
      `${API_BASE_URL}/user/${principal}/balances?lp=true&limit=999999&timestamp=${encodeURIComponent(timestamp)}`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching user balances:', error);
    return null;
  }
};

// Sort options for creators
export type CreatorSortOption = 'volume' | 'active' | 'weighted' | 'confidence' | 'success' | 'tokens' | 'holders';

// Bob's principal ID
const BOB_PRINCIPAL = 'bob-principal';

// Find top creators based on their token performance
export const findTopCreators = async (
  limit = 100, 
  sortBy: CreatorSortOption = 'confidence'
): Promise<CreatorPerformance[]> => {
  try {
    // Use the direct API endpoint to get top tokens
    const response = await axios.get(
      `${API_BASE_URL}/tokens?sort=marketcap%3Adesc&page=1&limit=30`
    );
    const topTokens = response.data.data || [];
    
    console.log(`Fetched ${topTokens.length} top tokens by marketcap`);
    
    // Extract unique creator principals
    const creatorSet = new Set<string>();
    topTokens.forEach((token: Token) => {
      if (token.creator && typeof token.creator === 'string') {
        creatorSet.add(token.creator);
      }
    });
    
    // Add Bob's principal if needed
    if (!creatorSet.has('bob-principal') && BOB_PRINCIPAL) {
      creatorSet.add(BOB_PRINCIPAL);
    }
    
    const creatorPrincipals = Array.from(creatorSet);
    console.log(`Found ${creatorPrincipals.length} unique creators from top tokens`);
    
    // Calculate performance for each creator
    const performancePromises = creatorPrincipals.map(principal => calculateCreatorPerformance(principal));
    
    const performances = await Promise.all(performancePromises);
    const validPerformances = performances.filter((perf): perf is CreatorPerformance => perf !== null);
    
    console.log(`Successfully calculated performance for ${validPerformances.length} creators`);
    
    // Sort based on selected criteria
    let sortedPerformances: CreatorPerformance[];
    switch (sortBy) {
      case 'volume':
        sortedPerformances = validPerformances.sort((a, b) => b.totalVolume - a.totalVolume);
        break;
      case 'active':
        sortedPerformances = validPerformances.sort((a, b) => b.activeTokens - a.activeTokens);
        break;
      case 'weighted':
        sortedPerformances = validPerformances.sort((a, b) => b.weightedScore - a.weightedScore);
        break;
      case 'confidence':
        sortedPerformances = validPerformances.sort((a, b) => b.confidenceScore - a.confidenceScore);
        break;
      case 'success':
        sortedPerformances = validPerformances.sort((a, b) => b.successRate - a.successRate);
        break;
      case 'tokens':
        sortedPerformances = validPerformances.sort((a, b) => b.totalTokens - a.totalTokens);
        break;
      case 'holders':
        sortedPerformances = validPerformances.sort((a, b) => {
          const aHolders = a.totalHolders || 0;
          const bHolders = b.totalHolders || 0;
          return bHolders - aHolders;
        });
        break;
      default:
        sortedPerformances = validPerformances.sort((a, b) => b.confidenceScore - a.confidenceScore);
    }
    
    // Add ranking and calculate total holders
    return sortedPerformances.slice(0, limit).map((perf, index) => ({
      ...perf,
      rank: index + 1,
      totalHolders: perf.totalHolders || perf.tokens.reduce((sum, t) => sum + t.holder_count, 0)
    }));
  } catch (error) {
    console.error('Error finding top creators:', error);
    return [];
  }
};

// Fetch Bob's data specifically
export const fetchBobData = async (): Promise<CreatorPerformance | null> => {
  try {
    // Bob's principal ID - replace with actual ID when known
    const bobPrincipal = 'bob-principal';
    
    // Try to get Bob's performance data
    const bobPerformance = await calculateCreatorPerformance(bobPrincipal);
    
    return bobPerformance;
  } catch (error) {
    console.error('Error fetching Bob data:', error);
    return null;
  }
};

// Get recent tokens with creator info
export const getRecentTokensWithCreators = async (limit = 10): Promise<{token: Token, creator: User | null}[]> => {
  try {
    const recentTokens = await getRecentTokens(limit);
    
    // Fetch creator info for each token
    const tokensWithCreators = await Promise.all(
      recentTokens.map(async (token) => {
        try {
          const creator = await getUser(token.creator);
          return { token, creator };
        } catch (error) {
          console.error(`Error fetching creator for token ${token.id}:`, error);
          return { token, creator: null };
        }
      })
    );
    
    return tokensWithCreators;
  } catch (error) {
    console.error('Error fetching recent tokens with creators:', error);
    return [];
  }
};

// Get recent tokens from all followed creators
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

// Mock data for testing when API fails
const getMockCreators = (limit = 10): CreatorPerformance[] => {
  const mockCreators: CreatorPerformance[] = [
    {
      principal: 'xbu3c-qr6zg-elfr3-btmjk-6ebsv-fr3oo-qeehp-sbatk-clg7t-bius7-qae',
      username: 'diamond_paws',
      image: null,
      totalTokens: 12,
      activeTokens: 10,
      totalVolume: 8427758377,
      successRate: 75.0,
      weightedScore: 0.75,
      confidenceScore: 75.0,
      tokens: [
        {
          id: '2jjj',
          name: 'ODINDOG',
          description: 'ODIN\'S DOG',
          image: '5707baf4-9a4f-4618-b2d6-19d2b397c488.webp',
          creator: 'xbu3c-qr6zg-elfr3-btmjk-6ebsv-fr3oo-qeehp-sbatk-clg7t-bius7-qae',
          created_time: '2024-12-28T03:26:40.000Z',
          volume: 84277583771085,
          bonded: true,
          icrc_ledger: 'eazb6-tqaaa-aaaar-qan2a-cai',
          price: 789821,
          marketcap: 16586241000000,
          rune: 'ODINDOG•ID•YTTL•ODIN',
          featured: false,
          holder_count: 5125,
          holder_top: 0,
          holder_dev: 60444412343328130,
          comment_count: 7157,
          sold: 1680000000000000000,
          twitter: '',
          website: '',
          telegram: '',
          last_comment_time: '2025-03-16T16:04:47.000Z',
          sell_count: 41748,
          buy_count: 71887,
          ticker: 'ODINDOG',
          btc_liquidity: 456128038527,
          token_liquidity: 57750690295635767,
          user_btc_liquidity: 197112329553,
          user_token_liquidity: 24877994810941760,
          user_lp_tokens: 115908020472976780,
          total_supply: 2100000000000000000,
          swap_fees: 0,
          swap_fees_24: 0,
          swap_volume: 84253275416853,
          swap_volume_24: 1039063250580,
          threshold: 1680000000000000000,
          txn_count: 113635,
          divisibility: 8,
          decimals: 3,
          withdrawals: true,
          deposits: true,
          trading: true,
          external: false,
          price_5m: 805231,
          price_1h: 802787,
          price_6h: 795104,
          price_1d: 735674,
          rune_id: '882601:678',
          last_action_time: '2025-03-16T16:05:22.000Z'
        }
      ]
    },
    {
      principal: 'vv5jb-7sm7u-vn3nq-6nflf-dghis-fd7ji-cx764-xunni-zosog-eqvpw-oae',
      username: 'crypto_whale',
      image: null,
      totalTokens: 8,
      activeTokens: 6,
      totalVolume: 5427758377,
      successRate: 87.5,
      weightedScore: 0.875,
      confidenceScore: 87.5,
      tokens: [
        {
          id: 'odin',
          name: 'ODIN',
          description: 'The native token of Odin.fun',
          image: 'odin-logo.webp',
          creator: 'vv5jb-7sm7u-vn3nq-6nflf-dghis-fd7ji-cx764-xunni-zosog-eqvpw-oae',
          created_time: '2024-10-15T12:00:00.000Z',
          volume: 54277583771085,
          bonded: true,
          icrc_ledger: 'eazb6-tqaaa-aaaar-qan2a-cai',
          price: 1789821,
          marketcap: 26586241000000,
          rune: 'ODIN•ID•YTTL•ODIN',
          featured: true,
          holder_count: 8125,
          holder_top: 0,
          holder_dev: 60444412343328130,
          comment_count: 9157,
          sold: 1680000000000000000,
          twitter: '',
          website: '',
          telegram: '',
          last_comment_time: '2025-03-16T16:04:47.000Z',
          sell_count: 31748,
          buy_count: 55887,
          ticker: 'ODIN',
          btc_liquidity: 556128038527,
          token_liquidity: 67750690295635767,
          user_btc_liquidity: 297112329553,
          user_token_liquidity: 34877994810941760,
          user_lp_tokens: 215908020472976780,
          total_supply: 2100000000000000000,
          swap_fees: 0,
          swap_fees_24: 0,
          swap_volume: 54253275416853,
          swap_volume_24: 2039063250580,
          threshold: 1680000000000000000,
          txn_count: 87635,
          divisibility: 8,
          decimals: 3,
          withdrawals: true,
          deposits: true,
          trading: true,
          external: false,
          price_5m: 1805231,
          price_1h: 1802787,
          price_6h: 1795104,
          price_1d: 1735674,
          rune_id: '882602:678',
          last_action_time: '2025-03-16T16:05:22.000Z'
        }
      ]
    },
    {
      principal: 'mock-creator-3',
      username: 'token_wizard',
      image: null,
      totalTokens: 15,
      activeTokens: 12,
      totalVolume: 3427758377,
      successRate: 66.7,
      weightedScore: 0.667,
      confidenceScore: 66.7,
      tokens: [
        {
          id: 'btc',
          name: 'Bitcoin',
          description: 'The original cryptocurrency',
          image: 'btc-logo.webp',
          creator: 'mock-creator-3',
          created_time: '2024-11-20T08:30:00.000Z',
          volume: 34277583771085,
          bonded: true,
          icrc_ledger: 'eazb6-tqaaa-aaaar-qan2a-cai',
          price: 2789821,
          marketcap: 36586241000000,
          rune: 'BTC•ID•YTTL•ODIN',
          featured: true,
          holder_count: 10125,
          holder_top: 0,
          holder_dev: 60444412343328130,
          comment_count: 12157,
          sold: 1680000000000000000,
          twitter: '',
          website: '',
          telegram: '',
          last_comment_time: '2025-03-16T16:04:47.000Z',
          sell_count: 21748,
          buy_count: 43887,
          ticker: 'BTC',
          btc_liquidity: 656128038527,
          token_liquidity: 77750690295635767,
          user_btc_liquidity: 397112329553,
          user_token_liquidity: 44877994810941760,
          user_lp_tokens: 315908020472976780,
          total_supply: 2100000000000000000,
          swap_fees: 0,
          swap_fees_24: 0,
          swap_volume: 34253275416853,
          swap_volume_24: 3039063250580,
          threshold: 1680000000000000000,
          txn_count: 65635,
          divisibility: 8,
          decimals: 3,
          withdrawals: true,
          deposits: true,
          trading: true,
          external: false,
          price_5m: 2805231,
          price_1h: 2802787,
          price_6h: 2795104,
          price_1d: 2735674,
          rune_id: '882603:678',
          last_action_time: '2025-03-16T16:05:22.000Z'
        }
      ]
    },
    {
      principal: 'mock-creator-4',
      username: 'meme_master',
      image: null,
      totalTokens: 25,
      activeTokens: 18,
      totalVolume: 2427758377,
      successRate: 60.0,
      weightedScore: 0.6,
      confidenceScore: 60.0,
      tokens: [
        {
          id: 'doge',
          name: 'Dogecoin',
          description: 'Much wow, very crypto',
          image: 'doge-logo.webp',
          creator: 'mock-creator-4',
          created_time: '2024-12-05T14:45:00.000Z',
          volume: 24277583771085,
          bonded: true,
          icrc_ledger: 'eazb6-tqaaa-aaaar-qan2a-cai',
          price: 89821,
          marketcap: 6586241000000,
          rune: 'DOGE•ID•YTTL•ODIN',
          featured: false,
          holder_count: 7125,
          holder_top: 0,
          holder_dev: 60444412343328130,
          comment_count: 8157,
          sold: 1680000000000000000,
          twitter: '',
          website: '',
          telegram: '',
          last_comment_time: '2025-03-16T16:04:47.000Z',
          sell_count: 31748,
          buy_count: 43887,
          ticker: 'DOGE',
          btc_liquidity: 256128038527,
          token_liquidity: 37750690295635767,
          user_btc_liquidity: 197112329553,
          user_token_liquidity: 24877994810941760,
          user_lp_tokens: 115908020472976780,
          total_supply: 2100000000000000000,
          swap_fees: 0,
          swap_fees_24: 0,
          swap_volume: 24253275416853,
          swap_volume_24: 1039063250580,
          threshold: 1680000000000000000,
          txn_count: 45635,
          divisibility: 8,
          decimals: 3,
          withdrawals: true,
          deposits: true,
          trading: true,
          external: false,
          price_5m: 90231,
          price_1h: 89787,
          price_6h: 88104,
          price_1d: 82674,
          rune_id: '882604:678',
          last_action_time: '2025-03-16T16:05:22.000Z'
        }
      ]
    },
    {
      principal: 'mock-creator-5',
      username: 'defi_builder',
      image: null,
      totalTokens: 7,
      activeTokens: 5,
      totalVolume: 1427758377,
      successRate: 85.7,
      weightedScore: 0.857,
      confidenceScore: 85.7,
      tokens: [
        {
          id: 'eth',
          name: 'Ethereum',
          description: 'Smart contract platform',
          image: 'eth-logo.webp',
          creator: 'mock-creator-5',
          created_time: '2024-11-10T10:15:00.000Z',
          volume: 14277583771085,
          bonded: true,
          icrc_ledger: 'eazb6-tqaaa-aaaar-qan2a-cai',
          price: 1589821,
          marketcap: 16586241000000,
          rune: 'ETH•ID•YTTL•ODIN',
          featured: true,
          holder_count: 6125,
          holder_top: 0,
          holder_dev: 60444412343328130,
          comment_count: 6157,
          sold: 1680000000000000000,
          twitter: '',
          website: '',
          telegram: '',
          last_comment_time: '2025-03-16T16:04:47.000Z',
          sell_count: 21748,
          buy_count: 31887,
          ticker: 'ETH',
          btc_liquidity: 356128038527,
          token_liquidity: 47750690295635767,
          user_btc_liquidity: 197112329553,
          user_token_liquidity: 24877994810941760,
          user_lp_tokens: 115908020472976780,
          total_supply: 2100000000000000000,
          swap_fees: 0,
          swap_fees_24: 0,
          swap_volume: 14253275416853,
          swap_volume_24: 1039063250580,
          threshold: 1680000000000000000,
          txn_count: 35635,
          divisibility: 8,
          decimals: 3,
          withdrawals: true,
          deposits: true,
          trading: true,
          external: false,
          price_5m: 1605231,
          price_1h: 1602787,
          price_6h: 1595104,
          price_1d: 1535674,
          rune_id: '882605:678',
          last_action_time: '2025-03-16T16:05:22.000Z'
        }
      ]
    }
  ];
  
  return mockCreators.slice(0, limit);
};

// Search tokens by query
export const searchTokens = async (query: string, limit = 30): Promise<Token[]> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/tokens?search=${encodeURIComponent(query)}&sort=last_action_time%3Adesc&page=1&limit=${limit}`
    );
    const tokens = response.data.data || [];
    
    // Add price_in_sats and check activity status for each token
    return tokens.map((token: Token) => {
      token.price_in_sats = convertPriceToSats(token.price);
      isTokenActive(token);
      return token;
    });
  } catch (error) {
    console.error('Error searching tokens:', error);
    return [];
  }
};

// Get rarity level based on confidence score
export const getRarityLevel = (score: number): string => {
  if (score >= 95) return 'legendary';   // Gold
  if (score >= 85) return 'epic';        // Purple
  if (score >= 75) return 'rare';        // Blue
  if (score >= 65) return 'uncommon';    // Green
  if (score >= 55) return 'common';      // White
  if (score >= 45) return 'basic';       // Gray
  if (score >= 35) return 'novice';      // Brown
  return 'beginner';                     // Red
}; 