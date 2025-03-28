import { useEffect, useCallback, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { fetchNewestTokens, fetchOlderTokens, processTokensWithCreators, setConfidenceFilter, setInitialLoadComplete, preloadTokensData } from '../redux/slices/tokensSlice';
import { formatLastUpdated } from '../utils/formatters';
import axios from 'axios';

// Import TokenWithCreator interface
import type { TokenWithCreator } from '../redux/slices/tokensSlice';

const LOCAL_STORAGE_KEYS = {
  NEWEST_TOKENS: 'recentPage_newestTokens',
  OLDER_TOKENS: 'recentPage_olderTokens',
  COMBINED_TOKENS: 'recentPage_combinedTokens',
  LAST_UPDATED: 'recentPage_lastUpdated'
};

export function useRecentTokensRedux() {
  const dispatch = useAppDispatch();
  const { 
    filteredTokens, 
    loading, 
    error, 
    lastUpdated, 
    newTokenIds, 
    confidenceFilter,
    combinedTokens
  } = useAppSelector(state => state.tokens);
  
  // État local pour suivre si les données ont été initialisées
  const [initialized, setInitialized] = useState(false);

  // Formater l'heure de dernière mise à jour
  const displayTime = lastUpdated ? formatLastUpdated(new Date(lastUpdated)) : '';

  // Fonction pour changer le filtre de confiance
  const handleConfidenceFilterChange = useCallback((filter: string) => {
    dispatch(setConfidenceFilter(filter));
  }, [dispatch]);

  // Sauvegarder les données dans localStorage quand elles changent
  useEffect(() => {
    if (combinedTokens.length > 0 && lastUpdated) {
      try {
        // Sauvegarder uniquement une version simplifiée des tokens pour réduire la taille
        const simplifiedTokens = combinedTokens.map(({ token, creator }) => ({
          token: {
            id: token.id,
            name: token.name,
            creator: token.creator,
            created_time: token.created_time,
            price: token.price,
            price_in_sats: token.price_in_sats,
            marketcap: token.marketcap,
            volume: token.volume,
            holder_count: token.holder_count,
            buy_count: token.buy_count,
            sell_count: token.sell_count,
            is_active: token.is_active
          },
          creator: creator ? {
            principal: creator.principal,
            username: creator.username,
            image: creator.image,
            confidenceScore: creator.confidenceScore
          } : null
        }));

        localStorage.setItem(LOCAL_STORAGE_KEYS.COMBINED_TOKENS, JSON.stringify(simplifiedTokens));
        localStorage.setItem(LOCAL_STORAGE_KEYS.LAST_UPDATED, lastUpdated);
        
        console.log('💾 Données sauvegardées dans localStorage');
      } catch (e) {
        console.error('Erreur lors de la sauvegarde dans localStorage:', e);
      }
    }
  }, [combinedTokens, lastUpdated]);

  // Mettre en place les récupérations automatiques des tokens
  useEffect(() => {
    if (initialized) return;
    
    // Première récupération des tokens via l'endpoint optimisé
    const fetchInitialData = async () => {
      try {
        // Vérifier d'abord si nous avons des données en cache localStorage
        const cachedTokens = localStorage.getItem(LOCAL_STORAGE_KEYS.COMBINED_TOKENS);
        const cachedLastUpdated = localStorage.getItem(LOCAL_STORAGE_KEYS.LAST_UPDATED);
        
        if (cachedTokens && cachedLastUpdated) {
          const lastUpdateTime = new Date(cachedLastUpdated).getTime();
          const currentTime = new Date().getTime();
          const dataAge = currentTime - lastUpdateTime;
          
          // Si les données ont moins de 1 minute, les utiliser directement
          if (dataAge < 60000) {
            console.log('🏪 Utilisation des données du localStorage (âge:', Math.round(dataAge/1000), 'secondes)');
            
            // Dispatcher les données du localStorage
            const parsedTokens = JSON.parse(cachedTokens);
            if (parsedTokens.length > 0) {
              // Utiliser directement les données combinées
              dispatch({ 
                type: 'tokens/processTokensWithCreators/fulfilled',
                payload: { 
                  tokens: parsedTokens,
                  newTokenIds: []
                }
              });
              
              // Marquer comme initialisé
              setInitialized(true);
              dispatch(setInitialLoadComplete());
              
              // Rafraîchir les données en arrière-plan
              refreshDataInBackground();
              return;
            }
          }
        }
        
        // Si pas de données en cache ou trop anciennes, utiliser l'endpoint optimisé
        console.log('🚀 Chargement initial des données depuis le cache Redis');
        const response = await axios.get('/api/cached-data');
        
        // Dispatcher les données préchargées en une fois
        await dispatch(preloadTokensData({
          newestTokens: response.data.newestTokens || [],
          recentTokens: response.data.recentTokens || []
        }));
        
        // Traiter les données après avoir récupéré les deux ensembles
        await dispatch(processTokensWithCreators());
        
        // Marquer le chargement initial comme terminé pour activer la détection des nouveaux tokens
        dispatch(setInitialLoadComplete());
        setInitialized(true);
        
        console.log('✅ Données initiales chargées depuis le cache Redis');
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        
        // Fallback: charger en parallèle selon la méthode traditionnelle
        console.log('⚠️ Fallback: chargement traditionnel des données');
        await Promise.all([
          dispatch(fetchNewestTokens()),
          dispatch(fetchOlderTokens(20))
        ]);
        
        await dispatch(processTokensWithCreators());
        dispatch(setInitialLoadComplete());
        setInitialized(true);
      }
    };
    
    fetchInitialData();
  }, [dispatch, initialized]);

  // Fonction pour rafraîchir les données en arrière-plan
  const refreshDataInBackground = useCallback(() => {
    // Configurer les intervalles de rafraîchissement automatique
    const newestTokensInterval = setInterval(() => {
      console.log('🔄 Redux: Automatic refresh for newest tokens');
      dispatch(fetchNewestTokens())
        .then(() => dispatch(processTokensWithCreators()));
    }, 15000); // 15 secondes
    
    const olderTokensInterval = setInterval(() => {
      console.log('🔄 Redux: Automatic refresh for older tokens');
      dispatch(fetchOlderTokens(20))
        .then(() => dispatch(processTokensWithCreators()));
    }, 45000); // 45 secondes
    
    // Rafraîchir immédiatement pour avoir les données les plus à jour
    dispatch(fetchNewestTokens())
      .then(() => dispatch(fetchOlderTokens(20)))
      .then(() => dispatch(processTokensWithCreators()));
    
    // Nettoyage
    return () => {
      clearInterval(newestTokensInterval);
      clearInterval(olderTokensInterval);
    };
  }, [dispatch]);
  
  // Mettre en place le rafraîchissement automatique
  useEffect(() => {
    if (!initialized) return;
    
    const cleanup = refreshDataInBackground();
    return () => {
      cleanup();
    };
  }, [refreshDataInBackground, initialized]);
  
  return {
    filteredTokens,
    loading,
    error,
    displayTime,
    newTokenIds,
    confidenceFilter,
    handleConfidenceFilterChange,
  };
} 