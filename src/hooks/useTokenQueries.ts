import { useQuery } from '@tanstack/react-query';
import { 
  Token, 
  getNewestTokens, 
  getOlderRecentTokens, 
  getTopTokens,
  findTopCreators,
  CreatorPerformance,
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
    staleTime: 10000, // 10 seconds - refresh every 10s
    refetchInterval: 10000, // 10 seconds between refetch
    ...options
  });
};

// Hook for older recent tokens
export const useOlderRecentTokens = (limit = 26, options?: any) => {
  return useQuery({
    queryKey: ['older-recent-tokens', limit],
    queryFn: () => getOlderRecentTokens(limit),
    staleTime: 60000, // 1 minute
    refetchInterval: 60000, // 1 minute between refetch
    ...options
  });
};

// Hook for top creators
export const useTopCreators = (
  limit = 200,
  sortBy: CreatorSortOption = 'confidence',
  forceRefresh = false,
  options?: any
) => {
  return useQuery({
    queryKey: ['top-creators', limit, sortBy, forceRefresh],
    queryFn: () => findTopCreators(limit, sortBy, forceRefresh),
    staleTime: 300000, // 5 minutes - longer stale time for top creators
    refetchInterval: 300000, // 5 minutes between refetch
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