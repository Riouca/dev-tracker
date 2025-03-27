import { useState, createContext, useEffect } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import { Dashboard } from './components/Dashboard'
import { RecentTokens } from './components/RecentTokens'
import { Favorites } from './components/Favorites'
import Search from './components/Search'
import { Token, CreatorPerformance } from './services/api'
import './App.css'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

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
      refetchOnMount: true,           // Refetch on mount if stale
      retry: 1,                      // Only retry failed queries once
      staleTime: 1000 * 60,           // Data considered stale after 1 minute
      gcTime: 1000 * 60 * 10,         // Keep unused data in cache for 10 minutes
      networkMode: 'online',          // Only make requests when online
    },
  },
})

function App() {
  // State for current page
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  
  // Preloaded data context
  const [dashboardData, setDashboardData] = useState<CreatorPerformance[]>([])
  const [recentTokens, setRecentTokens] = useState<Token[]>([])
  const [olderTokens, setOlderTokens] = useState<Token[]>([])
  const [lastDashboardUpdate, setLastDashboardUpdate] = useState<Date | null>(null)
  const [lastRecentUpdate, setLastRecentUpdate] = useState<Date | null>(null)
  const [lastOlderUpdate, setLastOlderUpdate] = useState<Date | null>(null)
  
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
            {currentPage === 'dashboard' && <Dashboard />}
            {currentPage === 'recent' && <RecentTokens />}
            {currentPage === 'search' && <Search />}
            {currentPage === 'favorites' && <Favorites />}
          </main>
          
          <Footer />
        </div>
      </PreloadContext.Provider>
      
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}

export default App
