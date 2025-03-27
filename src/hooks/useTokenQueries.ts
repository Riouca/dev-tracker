import { useQuery } from '@tanstack/react-query';
import { 
  getNewestTokens, 
  getOlderRecentTokens, 
  findTopCreators,
  CreatorSortOption,
  calculateCreatorPerformance,
  getTokenHolderData,
  getToken
} from '../services/api';

// Hook for newest tokens
export const useNewestTokens = (options?: any) => {
  return useQuery({
    queryKey: ['newest-tokens'],
    queryFn: getNewestTokens,
    staleTime: 5000, // 5 seconds - consider data stale quickly
    refetchInterval: 10000, // 10 seconds between refetch
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    cacheTime: 15000, // Only cache for 15 seconds to ensure fresh data on next fetch
    retry: 3, // Retry 3 times if the request fails
    ...options
  });
};

// Hook for older recent tokens (excluding the newest 4 tokens)
export const useOlderRecentTokens = (limit = 16, options?: any) => {
  return useQuery({
    queryKey: ['older-recent-tokens', limit],
    // Modified to explicitly request tokens 5+ (after the newest 4)
    queryFn: () => getOlderRecentTokens(limit, 4), // Skip the first 4 tokens
    staleTime: 15000, // 15 seconds - consider data stale faster
    refetchInterval: 30000, // 30 seconds between refetch
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    cacheTime: 30000, // Only cache for 30 seconds to ensure fresh data on next fetch
    retry: 3, // Retry 3 times if the request fails
    ...options
  });
};

// Hook for top creators
export const useTopCreators = (
  limit = 100,
  sortBy: CreatorSortOption = 'confidence',
  forceRefresh = false,
  options?: any
) => {
  return useQuery({
    queryKey: ['top-creators', limit, sortBy, forceRefresh],
    queryFn: () => findTopCreators(limit, sortBy, forceRefresh, 125), // 125 tokens pour extraire 100 devs uniques
    staleTime: 5400000, // 90 minutes - longer stale time for top creators
    refetchInterval: 5400000, // 90 minutes between refetch
    ...options
  });
};

// Hook for a single creator's performance
export const useCreatorPerformance = (
  principal: string,
  forceRefresh = false,
  options?: any
) => {
  return useQuery({
    queryKey: ['creator-performance', principal, forceRefresh],
    queryFn: () => calculateCreatorPerformance(principal, forceRefresh),
    staleTime: 300000, // 5 minutes
    enabled: !!principal, // Only run if principal is provided
    ...options
  });
};

// Hook to get multiple creators' performances in parallel
export const useMultipleCreatorPerformances = (
  principalIds: string[],
  options?: any
) => {
  return useQuery({
    queryKey: ['creators-performances', principalIds],
    queryFn: async () => {
      const promises = principalIds.map(principal => 
        calculateCreatorPerformance(principal)
      );
      return Promise.all(promises);
    },
    staleTime: 300000, // 5 minutes
    enabled: principalIds.length > 0, // Only run if there are principal IDs
    ...options
  });
};

// Hook for token holder data
export const useTokenHolderData = (
  tokenId: string,
  options?: any
) => {
  return useQuery({
    queryKey: ['token-holder-data', tokenId],
    queryFn: () => getTokenHolderData(tokenId),
    staleTime: 60000, // 1 minute
    enabled: !!tokenId, // Only run if tokenId is provided
    ...options
  });
};

// Hook for a single token
export const useToken = (
  tokenId: string,
  options?: any
) => {
  return useQuery({
    queryKey: ['token', tokenId],
    queryFn: () => getToken(tokenId),
    staleTime: 120000, // 2 minutes
    enabled: !!tokenId, // Only run if tokenId is provided
    ...options
  });
}; 