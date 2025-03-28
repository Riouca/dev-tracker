import { useState, createContext, useEffect, lazy, Suspense } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import { Token, CreatorPerformance, processTokensIntoCreators, processTokens } from './services/api'
import './App.css'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'

// Lazy load components
const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const RecentTokens = lazy(() => import('./components/RecentTokens').then(module => ({ default: module.RecentTokens })));
const Favorites = lazy(() => import('./components/Favorites').then(module => ({ default: module.Favorites })));
const Search = lazy(() => import('./components/Search'));

// Type for page navigation - match Header component
type Page = 'dashboard' | 'recent' | 'search' | 'favorites'

// Create context for preloaded data
type PreloadContextType = {
  dashboardData: CreatorPerformance[]
  recentTokens: Token[]
  olderTokens: Token[]
  lastDashboardUpdate: Date | null
  lastRecentUpdate: Date | null
  lastOlderUpdate: Date | null
  updateDashboardData: (data: CreatorPerformance[]) => void
  updateRecentTokens: (data: Token[]) => void
  updateOlderTokens: (data: Token[]) => void
}

export const PreloadContext = createContext<PreloadContextType>({
  dashboardData: [],
  recentTokens: [],
  olderTokens: [],
  lastDashboardUpdate: null,
  lastRecentUpdate: null,
  lastOlderUpdate: null,
  updateDashboardData: () => {},
  updateRecentTokens: () => {},
  updateOlderTokens: () => {}
})

// Create a client with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,    // Don't refetch when window is focused
      refetchOnMount: true,          // Refetch on mount by default (individual queries can override)
      retry: 2,                       // Retry failed queries twice
      staleTime: 1000 * 60 * 60,      // Data considered stale after 1 hour by default
      gcTime: 1000 * 60 * 60 * 2,     // Keep unused data in cache for 2 hours
      networkMode: 'online',          // Only make requests when online
    },
  },
})

// Composant de loading pour Suspense
const LoadingFallback = () => (
  <div className="app-loading">
    <div className="loading-spinner"></div>
    <p>Loading...</p>
  </div>
);

// Fonction pour récupérer les données précachées du serveur Redis
async function fetchCachedData() {
  try {
    const response = await fetch('http://localhost:4000/api/cached-data');
    if (!response.ok) {
      throw new Error('Failed to fetch cached data');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching cached data:', error);
    return null;
  }
}

function App() {
  // State for current page
  const [currentPage, setCurrentPage] = useState<Page>('recent')
  
  // Preloaded data context
  const [dashboardData, setDashboardData] = useState<CreatorPerformance[]>([])
  const [recentTokens, setRecentTokens] = useState<Token[]>([])
  const [olderTokens, setOlderTokens] = useState<Token[]>([])
  const [lastDashboardUpdate, setLastDashboardUpdate] = useState<Date | null>(null)
  const [lastRecentUpdate, setLastRecentUpdate] = useState<Date | null>(null)
  const [lastOlderUpdate, setLastOlderUpdate] = useState<Date | null>(null)
  
  // Charger les données précachées au lancement de l'application
  useEffect(() => {
    async function loadCachedData() {
      const cachedData = await fetchCachedData();
      
      if (cachedData) {
        // Traitement des tokens pour obtenir les créateurs
        if (cachedData.topTokens && cachedData.topTokens.length > 0) {
          try {
            // D'abord traiter les tokens pour ajouter le prix en sats et l'état d'activité
            const processedTokens = processTokens(cachedData.topTokens);
            
            // Ensuite, conversion des tokens en créateurs
            const topCreators = await processTokensIntoCreators(processedTokens);
            if (topCreators.length > 0) {
              updateDashboardData(topCreators);
              console.log('Processed and loaded cached top creators:', topCreators.length, 'creators');
            }
          } catch (error) {
            console.error('Error processing top tokens into creators:', error);
          }
        }
        
        if (cachedData.newestTokens && cachedData.newestTokens.length > 0) {
          // Traiter les tokens pour ajouter le prix en sats et l'état d'activité
          const processedTokens = processTokens(cachedData.newestTokens);
          updateRecentTokens(processedTokens);
          console.log('Loaded cached newest tokens:', processedTokens.length, 'tokens');
        }
        
        if (cachedData.recentTokens && cachedData.recentTokens.length > 0) {
          // Traiter les tokens pour ajouter le prix en sats et l'état d'activité
          const processedTokens = processTokens(cachedData.recentTokens);
          updateOlderTokens(processedTokens);
          console.log('Loaded cached recent tokens:', processedTokens.length, 'tokens');
        }
      }
    }
    
    loadCachedData();
  }, []);
  
  // Update functions with timestamp updates
  const updateDashboardData = (data: CreatorPerformance[]) => {
    setDashboardData(data)
    setLastDashboardUpdate(new Date())
  }
  
  const updateRecentTokens = (data: Token[]) => {
    setRecentTokens(data)
    setLastRecentUpdate(new Date())
  }
  
  const updateOlderTokens = (data: Token[]) => {
    setOlderTokens(data)
    setLastOlderUpdate(new Date())
  }
  
  // Handle navigation
  const handlePageChange = (page: Page) => {
    setCurrentPage(page)
    
    // If switching to a page that's not currently loaded, invalidate the queries
    // to ensure fresh data on navigation
    if (page === 'dashboard' && (!dashboardData || dashboardData.length === 0)) {
      queryClient.invalidateQueries({ queryKey: ['top-creators'] })
    }
    else if (page === 'recent' && (!recentTokens || recentTokens.length === 0)) {
      queryClient.invalidateQueries({ queryKey: ['newest-tokens'] })
      queryClient.invalidateQueries({ queryKey: ['older-recent-tokens'] })
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PreloadContext.Provider value={{
        dashboardData,
        recentTokens,
        olderTokens,
        lastDashboardUpdate,
        lastRecentUpdate,
        lastOlderUpdate,
        updateDashboardData,
        updateRecentTokens,
        updateOlderTokens
      }}>
        <div className="app-container">
          <Header 
            currentPage={currentPage} 
            onPageChange={handlePageChange} 
          />
          
          <main>
            <Suspense fallback={<LoadingFallback />}>
              {currentPage === 'dashboard' && <Dashboard />}
              {currentPage === 'recent' && <RecentTokens />}
              {currentPage === 'search' && <Search />}
              {currentPage === 'favorites' && <Favorites />}
            </Suspense>
          </main>
          
          <Footer />
        </div>
      </PreloadContext.Provider>
    </QueryClientProvider>
  )
}

export default App
