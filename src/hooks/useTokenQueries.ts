import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  getNewestTokens, 
  getOlderRecentTokens, 
  findTopCreators,
  CreatorSortOption,
  calculateCreatorPerformance,
  getTokenHolderData,
  getToken
} from '../services/api';
import { useEffect } from 'react';

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

// Hook for top creators - initialement 50 au lieu de 100, puis chargement en background
export const useTopCreators = (
  limit = 50, // Initialement 50 au lieu de 100
  sortBy: CreatorSortOption = 'confidence',
  forceRefresh = false,
  options?: any
) => {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['top-creators', limit, sortBy, forceRefresh],
    queryFn: () => findTopCreators(limit, sortBy, forceRefresh, 125), // 125 tokens pour extraire 100 devs uniques
    staleTime: 14400000, // 4 heures - aligned with Redis cache expiry (3 hours + margin)
    refetchInterval: 14400000, // 4 heures between refetch
    retry: 3, // Retry 3 times if the request fails
    refetchOnWindowFocus: false, // Don't refetch when window is focused
    refetchOnMount: false, // Don't refetch on mount to avoid unwanted API calls
    ...options
  });
  
  // Charger 100 creators en arrière-plan après le chargement initial réussi
  useEffect(() => {
    if (query.data && Array.isArray(query.data) && query.data.length > 0 && limit < 100) {
      console.log('Loading more creators (100) in background');
      setTimeout(() => {
        queryClient.prefetchQuery({
          queryKey: ['top-creators', 100, sortBy, forceRefresh],
          queryFn: () => findTopCreators(100, sortBy, forceRefresh, 125),
        });
      }, 2000);
    }
  }, [query.data, limit, sortBy, forceRefresh, queryClient]);
  
  return query;
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