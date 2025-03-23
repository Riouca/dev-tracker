import { useEffect, useState } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import { Dashboard } from './components/Dashboard'
import { RecentTokens } from './components/RecentTokens'
import Search from './components/Search'
import { Favorites } from './components/Favorites'
import './index.css'

type Page = 'dashboard' | 'recent' | 'search' | 'favorites'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  
  useEffect(() => {
    document.title = 'ForsetiScan | Track Successful Token Creators'
  }, [])

  const handlePageChange = (page: Page) => {
    setCurrentPage(page)
  }

  return (
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
  )
}

export default App
