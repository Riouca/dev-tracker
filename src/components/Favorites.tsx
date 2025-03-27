import { useState, useEffect, ChangeEvent } from 'react'
import { CreatorPerformance, CreatorSortOption, getRarityLevel } from '../services/api'
import { useTopCreators, useFavorites } from '../services/queries'
import CreatorCard from './CreatorCard'

export function Favorites() {
  // État local pour le tri et l'affichage
  const [sortBy, setSortBy] = useState<CreatorSortOption>('confidence')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [btcPrice, setBtcPrice] = useState<number | undefined>(undefined)
  
  // État de pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [creatorsPerPage, setCreatorsPerPage] = useState(10)
  const [paginatedCreators, setPaginatedCreators] = useState<CreatorPerformance[]>([])
  const [totalPages, setTotalPages] = useState(1)

  // Utiliser le hook useFavorites pour gérer les favoris
  const { getFavorites, isFavorite } = useFavorites()
  const followedCreatorIds = getFavorites()
  
  // Charger tous les créateurs
  const { 
    data: allCreators = [], 
    isLoading, 
    isError,
    error,
    refetch,
    dataUpdatedAt
  } = useTopCreators(100, 'confidence', false)
  
  // Filtrer pour n'obtenir que les créateurs suivis
  const followedCreators = allCreators.filter((creator: CreatorPerformance) => 
    followedCreatorIds.includes(creator.principal)
  )

  // Trier et filtrer les créateurs
  const sortedCreators = getSortedCreators(followedCreators, sortBy, sortDirection)
  const filteredCreators = sortedCreators.filter(creator => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase().trim()
    return (
      creator.username.toLowerCase().includes(query) ||
      creator.principal.toLowerCase().includes(query) ||
      (creator.tokens && creator.tokens.some(token => 
        token.name.toLowerCase().includes(query)
      ))
    )
  })

  // Mettre à jour les créateurs paginés quand les filtres changent
  useEffect(() => {
    updatePaginatedCreators()
  }, [filteredCreators, currentPage, creatorsPerPage])

  // Obtenir les créateurs triés
  function getSortedCreators(creatorsToSort: CreatorPerformance[], sortOption: CreatorSortOption, direction: 'asc' | 'desc'): CreatorPerformance[] {
    let sortedCreators = [...creatorsToSort]
    
    const sortFn = (a: CreatorPerformance, b: CreatorPerformance): number => {
      let result = 0
      
      switch (sortOption) {
        case 'volume':
          result = b.totalVolume - a.totalVolume
          break
        case 'active':
          result = b.activeTokens - a.activeTokens
          break
        case 'weighted':
          result = b.weightedScore - a.weightedScore
          break
        case 'confidence':
          result = b.confidenceScore - a.confidenceScore
          // Si les scores de confiance sont identiques, trier par marketcap
          if (result === 0) {
            result = b.totalMarketcap - a.totalMarketcap
          }
          break
        case 'success':
          result = b.successRate - a.successRate
          break
        case 'tokens':
          result = b.totalTokens - a.totalTokens
          break
        case 'holders':
          const aHolders = a.totalHolders || 0
          const bHolders = b.totalHolders || 0
          result = bHolders - aHolders
          break
        default:
          result = b.confidenceScore - a.confidenceScore
          // Si les scores de confiance sont identiques, trier par marketcap
          if (result === 0) {
            result = b.totalMarketcap - a.totalMarketcap
          }
      }
      
      return direction === 'asc' ? -result : result
    }
    
    sortedCreators.sort(sortFn)
    
    // Mettre à jour les rangs après le tri
    return sortedCreators.map((creator, index) => ({
      ...creator,
      rank: index + 1
    }))
  }

  // Mettre à jour la liste des créateurs paginés
  function updatePaginatedCreators() {
    const startIndex = (currentPage - 1) * creatorsPerPage
    const endIndex = startIndex + creatorsPerPage
    
    setPaginatedCreators(filteredCreators.slice(startIndex, endIndex))
    setTotalPages(Math.ceil(filteredCreators.length / creatorsPerPage))
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
    
    // Revenir à la première page
    setCurrentPage(1)
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
          {filteredCreators.length > 0 && (
            <>
              Showing {(currentPage - 1) * creatorsPerPage + 1} to {Math.min(currentPage * creatorsPerPage, filteredCreators.length)} of {filteredCreators.length} creators
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
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    
    if (diffMin < 1) return 'just now'
    if (diffMin === 1) return '1 minute ago'
    if (diffMin < 60) return `${diffMin} minutes ago`
    
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours === 1) return '1 hour ago'
    return `${diffHours} hours ago`
  }

  return (
    <div className="dashboard favorites">
      <div className="dashboard-header">
        <h1>Followed Developers</h1>
        <p className="dashboard-description">
          Track your favorite token creators
        </p>
      </div>
      
      <div className="dashboard-actions">
        <div className="dashboard-actions-left">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search by developer or token name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        
        <div className="dashboard-actions-right">
          <div className="last-updated">
            {dataUpdatedAt ? `Last updated: ${formatLastUpdated(new Date(dataUpdatedAt))}` : 'Loading...'}
          </div>
          <button 
            className="refresh-button" 
            onClick={() => refetch()} 
            disabled={isLoading}
          >
            {isLoading ? (
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
      
      {isLoading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading favorites...</div>
        </div>
      ) : isError ? (
        <div className="error">
          <p>Error loading favorites: {error ? String(error) : 'Unknown error'}</p>
          <button onClick={() => refetch()}>Try Again</button>
        </div>
      ) : followedCreators.length === 0 ? (
        <div className="empty-state">
          <p>You haven't followed any developers yet.</p>
          <p>Browse the top developers and click "Follow" to add them here.</p>
        </div>
      ) : filteredCreators.length === 0 ? (
        <div className="empty-state">
          <p>No developers found matching your search criteria.</p>
          <p>Try adjusting your search.</p>
        </div>
      ) : (
        <>
          <div className="creator-grid">
            {paginatedCreators.map((creator) => (
              <CreatorCard 
                key={creator.principal} 
                creator={creator}
                btcPrice={btcPrice || undefined}
              />
            ))}
          </div>
          
          {renderPagination()}
        </>
      )}
    </div>
  )
} 