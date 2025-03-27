import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { fetchNewestTokens, fetchOlderTokens, processTokensWithCreators, setConfidenceFilter, setInitialLoadComplete } from '../redux/slices/tokensSlice';
import { formatLastUpdated } from '../utils/formatters';

export function useRecentTokensRedux() {
  const dispatch = useAppDispatch();
  const { 
    filteredTokens, 
    loading, 
    error, 
    lastUpdated, 
    newTokenIds, 
    confidenceFilter 
  } = useAppSelector(state => state.tokens);

  // Formater l'heure de dernière mise à jour
  const displayTime = lastUpdated ? formatLastUpdated(new Date(lastUpdated)) : '';

  // Fonction pour changer le filtre de confiance
  const handleConfidenceFilterChange = useCallback((filter: string) => {
    dispatch(setConfidenceFilter(filter));
  }, [dispatch]);

  // Mettre en place les récupérations automatiques des tokens
  useEffect(() => {
    // Première récupération des tokens
    const fetchInitialData = async () => {
      // Charger en parallèle pour un chargement plus rapide
      await Promise.all([
        dispatch(fetchNewestTokens()),
        dispatch(fetchOlderTokens(20))
      ]);
      
      // Traiter les données après avoir récupéré les deux ensembles
      await dispatch(processTokensWithCreators());
      
      // Marquer le chargement initial comme terminé pour activer la détection des nouveaux tokens
      dispatch(setInitialLoadComplete());
    };
    
    fetchInitialData();
    
    // Configurer les intervalles de rafraîchissement automatique
    const newestTokensInterval = setInterval(() => {
      console.log('🔄 Redux: Automatic refresh for newest tokens');
      dispatch(fetchNewestTokens())
        .then(() => dispatch(processTokensWithCreators()));
    }, 10000); // 10 secondes
    
    const olderTokensInterval = setInterval(() => {
      console.log('🔄 Redux: Automatic refresh for older tokens');
      dispatch(fetchOlderTokens(20))
        .then(() => dispatch(processTokensWithCreators()));
    }, 30000); // 30 secondes
    
    // Nettoyage
    return () => {
      clearInterval(newestTokensInterval);
      clearInterval(olderTokensInterval);
    };
  }, [dispatch]);
  
  return {
    filteredTokens,
    loading,
    error,
    displayTime,
    newTokenIds,
    confidenceFilter,
    handleConfidenceFilterChange
  };
} 