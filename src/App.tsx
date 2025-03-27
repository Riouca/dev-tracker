import { useState, createContext } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Header from './components/Header'
import Footer from './components/Footer'
import { Dashboard } from './components/Dashboard'
import { RecentTokens } from './components/RecentTokens'
import Search from './components/Search'
import { Favorites } from './components/Favorites'
import { CreatorPerformance, Token } from './services/api'
import './index.css'

// Création du QueryClient avec configuration pour la performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // Considère les données comme "fraîches" pendant 5 minutes
      gcTime: 1000 * 60 * 60, // Garde les données en cache pendant 60 minutes (anciennement cacheTime)
      retry: 1, // Limite les tentatives de requête en cas d'échec
    },
  },
})

type Page = 'dashboard' | 'recent' | 'search' | 'favorites'

interface PreloadContextType {
  dashboardData: CreatorPerformance[];
  recentTokens: Token[];
  olderTokens: Token[];
  updateDashboardData: (data: CreatorPerformance[]) => void;
  updateRecentTokens: (data: Token[]) => void;
  updateOlderTokens: (data: Token[]) => void;
  lastDashboardUpdate: Date | null;
  lastRecentUpdate: Date | null;
  lastOlderUpdate: Date | null;
}

export const PreloadContext = createContext<PreloadContextType>({
  dashboardData: [],
  recentTokens: [],
  olderTokens: [],
  updateDashboardData: () => {},
  updateRecentTokens: () => {},
  updateOlderTokens: () => {},
  lastDashboardUpdate: null,
  lastRecentUpdate: null,
  lastOlderUpdate: null
});

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [dashboardData, setDashboardData] = useState<CreatorPerformance[]>([])
  const [recentTokens, setRecentTokens] = useState<Token[]>([])
  const [olderTokens, setOlderTokens] = useState<Token[]>([])
  const [lastDashboardUpdate, setLastDashboardUpdate] = useState<Date | null>(null)
  const [lastRecentUpdate, setLastRecentUpdate] = useState<Date | null>(null)
  const [lastOlderUpdate, setLastOlderUpdate] = useState<Date | null>(null)

  const handlePageChange = (page: Page) => {
    setCurrentPage(page)
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PreloadContext.Provider value={{
        dashboardData,
        recentTokens,
        olderTokens,
        updateDashboardData: setDashboardData,
        updateRecentTokens: setRecentTokens,
        updateOlderTokens: setOlderTokens,
        lastDashboardUpdate,
        lastRecentUpdate, 
        lastOlderUpdate
      }}>
        <div className="app">
          <Header currentPage={currentPage} onPageChange={handlePageChange} />
          <main className="app-main">
            {currentPage === 'dashboard' && <Dashboard />}
            {currentPage === 'recent' && <RecentTokens />}
            {currentPage === 'search' && <Search />}
            {currentPage === 'favorites' && <Favorites />}
          </main>
          <Footer />
        </div>
      </PreloadContext.Provider>
    </QueryClientProvider>
  )
}

export default App
