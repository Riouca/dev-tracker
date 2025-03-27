import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { 
  getCreatorTokens, 
  getNewestTokens, 
  findTopCreators as getTopCreators, 
  getFollowedCreatorsTokens,
  CreatorPerformance,
  CreatorSortOption,
  Token as ApiToken,
  getBTCPrice,
  getOlderRecentTokens
} from './api';

// Hook pour gérer les favoris
export function useFavorites() {
  const getFavorites = (): string[] => {
    const stored = localStorage.getItem('followedCreators');
    return stored ? JSON.parse(stored) : [];
  };

  const addFavorite = (creatorId: string): void => {
    const favorites = getFavorites();
    if (!favorites.includes(creatorId)) {
      favorites.push(creatorId);
      localStorage.setItem('followedCreators', JSON.stringify(favorites));
      
      // Déclencher un événement pour que les autres composants puissent réagir
      window.dispatchEvent(new CustomEvent('followStatusChanged'));
    }
  };

  const removeFavorite = (creatorId: string): void => {
    const favorites = getFavorites();
    const updatedFavorites = favorites.filter(id => id !== creatorId);
    localStorage.setItem('followedCreators', JSON.stringify(updatedFavorites));
    
    // Déclencher un événement pour que les autres composants puissent réagir
    window.dispatchEvent(new CustomEvent('followStatusChanged'));
  };

  const isFavorite = (creatorId: string): boolean => {
    return getFavorites().includes(creatorId);
  };

  const toggleFavorite = (creatorId: string): void => {
    if (isFavorite(creatorId)) {
      removeFavorite(creatorId);
    } else {
      addFavorite(creatorId);
    }
  };

  return {
    getFavorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite
  };
}

// Hook pour récupérer les top créateurs
export function useTopCreators(
  limit = 30,
  sortBy: CreatorSortOption = 'confidence',
  includeUnverified = false,
  options?: UseQueryOptions<CreatorPerformance[], Error>
) {
  return useQuery({
    queryKey: ['topCreators', limit, sortBy, includeUnverified],
    queryFn: () => getTopCreators(limit, sortBy, includeUnverified),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    ...options
  });
}

// Hook pour récupérer les tokens d'un créateur
export function useCreatorTokens(
  creatorId: string,
  options?: UseQueryOptions<ApiToken[], Error>
) {
  return useQuery({
    queryKey: ['creatorTokens', creatorId],
    queryFn: () => getCreatorTokens(creatorId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: !!creatorId,
    ...options
  });
}

// Hook pour récupérer les nouveaux tokens
export function useNewestTokens(
  limit = 20,
  options?: UseQueryOptions<ApiToken[], Error>
) {
  return useQuery({
    queryKey: ['newestTokens', limit],
    queryFn: () => getNewestTokens(),
    staleTime: 1 * 60 * 1000, // 1 minute - Les nouveaux tokens sont mis à jour fréquemment
    refetchOnWindowFocus: true,
    ...options
  });
}

// Hook pour récupérer les tokens plus anciens
export function useOlderRecentTokens(
  limit = 26,
  page = 1,
  options?: UseQueryOptions<ApiToken[], Error>
) {
  return useQuery({
    queryKey: ['olderTokens', limit, page],
    queryFn: () => getOlderRecentTokens(limit),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options
  });
}

// Hook pour récupérer les tokens des créateurs suivis
export function useFollowedCreatorsTokens(
  creatorIds: string[],
  options?: UseQueryOptions<ApiToken[], Error>
) {
  return useQuery({
    queryKey: ['followedCreatorsTokens', creatorIds],
    queryFn: () => getFollowedCreatorsTokens(creatorIds),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    enabled: creatorIds.length > 0,
    ...options
  });
}

// Hook pour récupérer le prix du BTC
export function useBTCPrice(options?: UseQueryOptions<number, Error>) {
  return useQuery({
    queryKey: ['btcPrice'],
    queryFn: getBTCPrice,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
    ...options
  });
} 