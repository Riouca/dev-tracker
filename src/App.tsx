import { useEffect, useState, createContext, useContext } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import { Dashboard } from './components/Dashboard'
import { RecentTokens } from './components/RecentTokens'
import Search from './components/Search'
import { Favorites } from './components/Favorites'
import { findTopCreators, CreatorPerformance, getNewestTokens, getOlderRecentTokens, Token } from './services/api'
import './index.css'

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
  
  // Silently preload data in the background
  useEffect(() => {
    // Initial data load on mount
    loadDashboardData(false)
    loadRecentTokens()
    loadOlderTokens()
    
    // Setup background refresh intervals
    const dashboardInterval = setInterval(() => loadDashboardData(false), 20 * 60 * 1000) // 20 minutes
    const recentTokensInterval = setInterval(() => loadRecentTokens(), 10 * 1000) // 10 seconds
    const olderTokensInterval = setInterval(() => loadOlderTokens(), 60 * 1000) // 1 minute
    
    return () => {
      clearInterval(dashboardInterval)
      clearInterval(recentTokensInterval)
      clearInterval(olderTokensInterval)
    }
  }, [])
  
  const loadDashboardData = async (forceRefresh = false) => {
    // Only do network fetch if the data is stale or force refreshing
    if (forceRefresh || !lastDashboardUpdate || (new Date().getTime() - lastDashboardUpdate.getTime() > 19 * 60 * 1000)) {
      try {
        console.log('Background loading dashboard data...')
        const data = await findTopCreators(100, 'confidence', forceRefresh)
        if (data.length > 0) {
          setDashboardData(data)
          setLastDashboardUpdate(new Date())
        }
      } catch (error) {
        console.error('Background dashboard data loading failed:', error)
      }
    } else {
      console.log('Dashboard data is still fresh, skipping update')
    }
  }
  
  const loadRecentTokens = async () => {
    // Check if current data is still fresh (less than 9 seconds old)
    if (lastRecentUpdate && (new Date().getTime() - lastRecentUpdate.getTime() < 9000)) {
      console.log('Recent tokens data is still fresh, skipping update')
      return
    }
    
    try {
      console.log('Background loading newest tokens...')
      const data = await getNewestTokens()
      if (data.length > 0) {
        setRecentTokens(data)
        setLastRecentUpdate(new Date())
      }
    } catch (error) {
      console.error('Background recent tokens loading failed:', error)
    }
  }
  
  const loadOlderTokens = async () => {
    // Check if current data is still fresh (less than 59 seconds old)
    if (lastOlderUpdate && (new Date().getTime() - lastOlderUpdate.getTime() < 59000)) {
      console.log('Older tokens data is still fresh, skipping update')
      return
    }
    
    try {
      console.log('Background loading older tokens...')
      const data = await getOlderRecentTokens()
      if (data.length > 0) {
        setOlderTokens(data)
        setLastOlderUpdate(new Date())
      }
    } catch (error) {
      console.error('Background older tokens loading failed:', error)
    }
  }

  const handlePageChange = (page: Page) => {
    // If user is navigating to dashboard or recent, prioritize that data load
    if (page === 'dashboard' && currentPage !== 'dashboard') {
      loadDashboardData(false)
    } else if (page === 'recent' && currentPage !== 'recent') {
      loadRecentTokens()
      loadOlderTokens()
    }
    
    setCurrentPage(page)
  }

  return (
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
  )
}

export default App
