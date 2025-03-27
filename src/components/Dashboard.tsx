import { useState, useEffect, useContext, ChangeEvent } from 'react'
import { CreatorPerformance, CreatorSortOption, getRarityLevel } from '../services/api'
import { useTopCreators, useBTCPrice } from '../services/queries'
import CreatorCard from './CreatorCard'
import { PreloadContext } from '../App'

export function Dashboard() {
  // État local pour le tri des créateurs
  const [sortBy, setSortBy] = useState<CreatorSortOption>('confidence')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all')
  
  // État de pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [creatorsPerPage, setCreatorsPerPage] = useState(10)
  
  // États pour le prix BTC
  const { data: btcPrice } = useBTCPrice()
  
  // Utiliser React Query pour charger les créateurs
  const { 
    data: topCreators = [], 
    isLoading, 
    isError,
    error,
    refetch,
    isFetching,
    dataUpdatedAt
  } = useTopCreators(100, sortBy, false)

  // Tri et filtrage des créateurs
  const filteredAndSortedCreators = filterCreators(sortCreators(topCreators, sortDirection, sortBy))
  
  // Pagination
  const [paginatedCreators, setPaginatedCreators] = useState<CreatorPerformance[]>([])
  const totalPages = Math.ceil(filteredAndSortedCreators.length / creatorsPerPage)
  
  // Mettre à jour les créateurs paginés quand les filtres changent
  useEffect(() => {
    updatePaginatedCreators()
  }, [filteredAndSortedCreators, currentPage, creatorsPerPage])

  // Fonction pour trier les créateurs
  function sortCreators(creators: CreatorPerformance[], direction: 'asc' | 'desc' = 'desc', sortOption: CreatorSortOption) {
    const sortedCreators = [...creators]
    
    switch (sortOption) {
      case 'volume':
        sortedCreators.sort((a, b) => {
          return direction === 'desc' 
            ? b.totalVolume - a.totalVolume 
            : a.totalVolume - b.totalVolume
        })
        break
      case 'active':
        sortedCreators.sort((a, b) => {
          return direction === 'desc' 
            ? b.activeTokens - a.activeTokens 
            : a.activeTokens - b.activeTokens
        })
        break
      case 'weighted':
        sortedCreators.sort((a, b) => {
          return direction === 'desc' 
            ? b.weightedScore - a.weightedScore 
            : a.weightedScore - b.weightedScore
        })
        break
      case 'confidence':
        sortedCreators.sort((a, b) => {
          return direction === 'desc' 
            ? b.confidenceScore - a.confidenceScore 
            : a.confidenceScore - b.confidenceScore
        })
        break
      case 'success':
        sortedCreators.sort((a, b) => {
          return direction === 'desc' 
            ? b.successRate - a.successRate 
            : a.successRate - b.successRate
        })
        break
      case 'tokens':
        sortedCreators.sort((a, b) => {
          return direction === 'desc' 
            ? b.totalTokens - a.totalTokens 
            : a.totalTokens - b.totalTokens
        })
        break
      case 'holders':
        sortedCreators.sort((a, b) => {
          const aHolders = a.totalHolders || 0
          const bHolders = b.totalHolders || 0
          return direction === 'desc' 
            ? bHolders - aHolders 
            : aHolders - bHolders
        })
        break
      default:
        sortedCreators.sort((a, b) => {
          return direction === 'desc' 
            ? b.confidenceScore - a.confidenceScore 
            : a.confidenceScore - b.confidenceScore
        })
    }
    
    return sortedCreators
  }

  // Filtrer les créateurs par niveau de confiance
  function filterCreators(sortedCreators = topCreators) {
    if (confidenceFilter === 'all') {
      return sortedCreators
    }
    
    return sortedCreators.filter(creator => {
      const score = creator.confidenceScore
      const level = getRarityLevel(score)
      return level === confidenceFilter
    })
  }

  // Mettre à jour la liste des créateurs paginés
  function updatePaginatedCreators() {
    const startIndex = (currentPage - 1) * creatorsPerPage
    const endIndex = startIndex + creatorsPerPage
    setPaginatedCreators(filteredAndSortedCreators.slice(startIndex, endIndex))
  }

  // Gérer le changement de critère de tri
  function handleSortChange(newSortBy: CreatorSortOption) {
    if (newSortBy === sortBy) {
      // Si on clique sur le même critère, inverser la direction de tri
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')
    } else {
      // Sinon, changer le critère et revenir à desc par défaut
      setSortBy(newSortBy)
      setSortDirection('desc')
    }
  }

  // Gérer le changement de page
  function handlePageChange(page: number) {
    setCurrentPage(page)
  }

  // Gérer le changement du nombre de créateurs par page
  function handleCreatorsPerPageChange(e: ChangeEvent<HTMLSelectElement>) {
    setCreatorsPerPage(Number(e.target.value))
    setCurrentPage(1) // Retour à la première page
  }

  // Obtenir la flèche de tri
  function getSortArrow(option: CreatorSortOption) {
    if (option !== sortBy) return null
    return sortDirection === 'desc' ? '▼' : '▲'
  }

  // Rendu de la pagination
  function renderPagination() {
    if (totalPages <= 1) return null
    
    const pageNumbers = []
    const maxVisiblePages = 5
    
    // Logique pour afficher les numéros de page de manière intelligente
    if (totalPages <= maxVisiblePages) {
      // Afficher toutes les pages si leur nombre est inférieur à maxVisiblePages
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      // Afficher les premières pages, la page actuelle et les dernières pages
      if (currentPage <= 3) {
        // Proche du début
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i)
        }
        pageNumbers.push('...')
        pageNumbers.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        // Proche de la fin
        pageNumbers.push(1)
        pageNumbers.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pageNumbers.push(i)
        }
      } else {
        // Au milieu
        pageNumbers.push(1)
        pageNumbers.push('...')
        pageNumbers.push(currentPage - 1)
        pageNumbers.push(currentPage)
        pageNumbers.push(currentPage + 1)
        pageNumbers.push('...')
        pageNumbers.push(totalPages)
      }
    }
    
    return (
      <div className="pagination-container">
        <div className="pagination">
          <button 
            className="pagination-button prev"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            &laquo; Prev
          </button>
          
          {pageNumbers.map((page, index) => (
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
            ) : (
              <button 
                key={`page-${page}`}
                className={`pagination-button ${currentPage === page ? 'active' : ''}`}
                onClick={() => handlePageChange(page as number)}
              >
                {page}
              </button>
            )
          ))}
          
          <button 
            className="pagination-button next"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next &raquo;
          </button>
        </div>
        
        <div className="pagination-info">
          {filteredAndSortedCreators.length > 0 && (
            <>
              Showing {(currentPage - 1) * creatorsPerPage + 1} to {Math.min(currentPage * creatorsPerPage, filteredAndSortedCreators.length)} of {filteredAndSortedCreators.length} creators
            </>
          )}
        </div>
        
        <div className="pagination-options">
          <label htmlFor="creatorsPerPage">Show: </label>
          <select 
            id="creatorsPerPage" 
            className="creators-per-page-select"
            value={creatorsPerPage}
            onChange={handleCreatorsPerPageChange}
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>
    )
  }

  // Formater la date de dernière mise à jour
  function formatLastUpdated(date: Date) {
    // Format like: "5 mins ago" or "just now"
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    
    if (diffMin < 1) {
      return 'just now'
    } else if (diffMin === 1) {
      return '1 min ago'
    } else if (diffMin < 60) {
      return `${diffMin} mins ago`
    } else {
      const diffHour = Math.floor(diffMin / 60)
      if (diffHour === 1) {
        return '1 hour ago'
      } else {
        return `${diffHour} hours ago`
      }
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Creator Dashboard</h1>
        <p className="dashboard-description">
          Top creators ranked by performance metrics. 
          <span className="info-link" title="Performance is calculated based on token success rate, volume, and other metrics.">
            ⓘ
          </span>
        </p>
      </div>
      
      <div className="dashboard-actions">
        <div className="dashboard-actions-left">
          <div className="confidence-filter">
            <label htmlFor="confidence-select">Filter: </label>
            <select 
              id="confidence-select" 
              className="confidence-select"
              value={confidenceFilter}
              onChange={(e) => setConfidenceFilter(e.target.value)}
            >
              <option value="all">All Levels</option>
              <option value="legendary">Legendary</option>
              <option value="epic">Epic</option>
              <option value="great">Great</option>
              <option value="okay">Okay</option>
              <option value="neutral">Neutral</option>
              <option value="meh">Meh</option>
              <option value="scam">Poor</option>
            </select>
          </div>
        </div>
        
        <div className="dashboard-actions-right">
          <div className="last-updated">
            Last updated: {dataUpdatedAt ? formatLastUpdated(new Date(dataUpdatedAt)) : 'Loading...'}
          </div>
          <button 
            className="refresh-button" 
            onClick={() => refetch()} 
            disabled={isFetching}
          >
            {isFetching ? (
              <>
                <span className="spinner"></span>
                Refreshing...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <polyline points="23 20 23 14 17 14"></polyline>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="dashboard-content">
        <div className="sort-options-container">
          <div className="sort-options">
            <div className="sort-label">Sort by:</div>
            <div className="sort-buttons">
              <button 
                className={`sort-button ${sortBy === 'confidence' ? 'active' : ''}`}
                onClick={() => handleSortChange('confidence')}
              >
                Confidence {getSortArrow('confidence')}
              </button>
              <button 
                className={`sort-button ${sortBy === 'weighted' ? 'active' : ''}`}
                onClick={() => handleSortChange('weighted')}
              >
                Weighted {getSortArrow('weighted')}
              </button>
              <button 
                className={`sort-button ${sortBy === 'volume' ? 'active' : ''}`}
                onClick={() => handleSortChange('volume')}
              >
                Volume {getSortArrow('volume')}
              </button>
              <button 
                className={`sort-button ${sortBy === 'success' ? 'active' : ''}`}
                onClick={() => handleSortChange('success')}
              >
                Success {getSortArrow('success')}
              </button>
              <button 
                className={`sort-button ${sortBy === 'active' ? 'active' : ''}`}
                onClick={() => handleSortChange('active')}
              >
                Active {getSortArrow('active')}
              </button>
              <button 
                className={`sort-button ${sortBy === 'tokens' ? 'active' : ''}`}
                onClick={() => handleSortChange('tokens')}
              >
                Tokens {getSortArrow('tokens')}
              </button>
              <button 
                className={`sort-button ${sortBy === 'holders' ? 'active' : ''}`}
                onClick={() => handleSortChange('holders')}
              >
                Holders {getSortArrow('holders')}
              </button>
            </div>
          </div>
        </div>
        
        {isLoading && (
          <div className="loading">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading creators...</div>
          </div>
        )}
        
        {isError ? (
          <div className="error">
            <p>Error loading creators: {error ? String(error) : 'Unknown error'}</p>
            <button onClick={() => refetch()}>Try Again</button>
          </div>
        ) : (
          <>
            <div className="creator-grid">
              {paginatedCreators.map((creator) => (
                <CreatorCard 
                  key={creator.principal} 
                  creator={creator}
                  btcPrice={btcPrice}
                />
              ))}
            </div>
            
            {renderPagination()}
            
            <div className="last-updated-footer">
              <div className="last-updated">
                Last updated: {dataUpdatedAt ? formatLastUpdated(new Date(dataUpdatedAt)) : 'Loading...'}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 