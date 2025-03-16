import { useEffect, useState } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import { Dashboard } from './components/Dashboard'
import { RecentTokens } from './components/RecentTokens'
import './index.css'

type Page = 'dashboard' | 'recent' | 'search'

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
      </main>
      <Footer />
    </div>
  )
}

export default App
