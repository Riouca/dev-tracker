import { useState } from 'react'
import Header from './components/Header'
import { Dashboard } from './components/Dashboard'
import { RecentTokens } from './components/RecentTokens'
import { Search } from './components/Search'
import Footer from './components/Footer'
import './index.css'

type Page = 'dashboard' | 'recent' | 'search'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')

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
      </main>
      <Footer />
    </div>
  )
}

export default App
