import { useState, useEffect, ChangeEvent, useContext } from 'react'
import { findTopCreators, CreatorPerformance, CreatorSortOption } from '../services/api'
import CreatorCard from './CreatorCard'
import { PreloadContext } from '../App'

export function Dashboard() {
  // Contexte pour les données préchargées
  const { dashboardData: preloadedData, updateDashboardData, lastDashboardUpdate } = useContext(PreloadContext)
  
  const [creators, setCreators] = useState<CreatorPerformance[]>([])
  const [displayedCreators, setDisplayedCreators] = useState<CreatorPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Default sorting is based on confidence score, which combines success rate,
  // volume, and active tokens count for an overall developer assessment
  const [sortBy, setSortBy] = useState<CreatorSortOption>('confidence')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [displayTime, setDisplayTime] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [creatorsPerPage, setCreatorsPerPage] = useState(20)
  const [paginatedCreators, setPaginatedCreators] = useState<CreatorPerformance[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [silentlyUpdating, setSilentlyUpdating] = useState(false)

  // Utiliser les données préchargées dès le montage du composant
  useEffect(() => {
    if (preloadedData && preloadedData.length > 0) {
      console.log('Using preloaded dashboard data')
      setCreators(preloadedData)
      setDisplayedCreators(sortCreators(preloadedData, sortDirection, sortBy))
      setLoading(false)
      setLastUpdated(lastDashboardUpdate || new Date())
      
      // Si les données préchargées sont récentes (moins de 5 minutes), ne pas forcer un rechargement
      const now = new Date()
      const isFresh = lastDashboardUpdate && (now.getTime() - lastDashboardUpdate.getTime() < 5 * 60 * 1000)
      
      if (!isFresh) {
        // Si données trop anciennes, charger silencieusement
        silentlyLoadData()
      }
    } else {
      // Si aucune donnée préchargée n'est disponible, commençons à charger
      // avec un indicateur mais gardons loading=true pour montrer le loader
      setLoading(true)
      loadCreators()
    }
  }, [preloadedData])

  // Méthode pour charger silencieusement les données sans état de chargement
  const silentlyLoadData = async () => {
    if (silentlyUpdating) return // Éviter les chargements parallèles
    
    try {
      setSilentlyUpdating(true)
      console.log('Silently updating dashboard data...')
      let tempCreators = await findTopCreators(100, 'confidence', true)
      
      // Filter out creators with no username
      tempCreators = tempCreators.filter(creator => creator.username)
      
      // Mettre à jour le contexte global pour le préchargement
      updateDashboardData(tempCreators)
      
      // Mettre à jour l'état local
      setCreators(tempCreators)
      setDisplayedCreators(sortCreators(tempCreators, sortDirection, sortBy))
      setLastUpdated(new Date())
      
      // Stocker le timestamp dans localStorage
      localStorage.setItem('forseti_creators_cache_timestamp', Date.now().toString())
    } catch (error) {
      console.error('Silent update failed:', error)
      // Pas d'affichage d'erreur à l'utilisateur pour les mises à jour silencieuses
    } finally {
      setSilentlyUpdating(false)
    }
  }

  // Load creators on initial render and auto-refresh every 20 minutes
  useEffect(() => {
    // Initial load already handled by the first useEffect
    
    // Set up polling every 20 minutes (1200000 ms)
    const intervalId = setInterval(() => {
      console.log('Auto-refreshing dashboard data...')
      silentlyLoadData()  // Utiliser mise à jour silencieuse
    }, 1200000) // 20 minutes
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId)
  }, [])

  // Sort creators when sortBy, sortDirection, or creators change
  useEffect(() => {
    if (creators.length > 0) {
      sortCreators(creators, sortDirection, sortBy)
    }
  }, [sortBy, sortDirection, creators])

  // Update displayed creators when search query changes
  useEffect(() => {
    if (creators.length > 0) {
      filterCreators()
    }
  }, [searchQuery, creators])

  // Update paginated creators when displayedCreators or currentPage changes
  useEffect(() => {
    updatePaginatedCreators()
  }, [displayedCreators, currentPage, creatorsPerPage])

  // Check for cached timestamp
  useEffect(() => {
    const cachedTimestamp = localStorage.getItem('forseti_creators_cache_timestamp')
    if (cachedTimestamp) {
      setLastUpdated(new Date(parseInt(cachedTimestamp, 10)))
    }
  }, [])

  // Add effect to refresh the "Last updated" display every minute
  useEffect(() => {
    if (!lastUpdated) return
    
    // Initial format
    setDisplayTime(formatLastUpdated(lastUpdated))
    
    // Update the time display every second
    const timeDisplayInterval = setInterval(() => {
      if (lastUpdated) {
        setDisplayTime(formatLastUpdated(lastUpdated))
      }
    }, 1000)
    
    return () => clearInterval(timeDisplayInterval)
  }, [lastUpdated])

  // Charger les créateurs avec un affichage progressif
  const loadCreators = async () => {
    try {
      setError(null)
      
      // Commence à charger les créateurs par batches
      const batchSize = 10 // Afficher les 10 premiers immédiatement
      
      // Première requête pour obtenir les créateurs rapidement
      const initialCreators = await findTopCreators(batchSize, 'confidence')
      
      if (initialCreators.length > 0) {
        // Afficher immédiatement le premier lot
        setCreators(initialCreators)
        setDisplayedCreators(sortCreators(initialCreators, sortDirection, sortBy))
        
        // Montrer indicateur de chargement partiel
        setLoading(false)
        
        // Continuer à charger le reste en arrière-plan
        setTimeout(async () => {
          try {
            // Charge le reste des créateurs
            const allCreators = await findTopCreators(100, 'confidence')
            
            // Mettre à jour avec l'ensemble complet
            setCreators(allCreators)
            setDisplayedCreators(sortCreators(allCreators, sortDirection, sortBy))
          } catch (backgroundError) {
            console.error('Error loading remaining creators:', backgroundError)
            // Ne pas montrer d'erreur puisque nous avons déjà des données
          }
        }, 100) // Petit délai pour laisser l'UI respirer
      } else {
        // Pas de données, charger normalement
        const allCreators = await findTopCreators(100, 'confidence')
        setCreators(allCreators)
        setDisplayedCreators(sortCreators(allCreators, sortDirection, sortBy))
        setLoading(false)
      }
    } catch (err) {
      console.error('Error loading creators:', err)
      setError('Failed to load creators. Please try again later.')
      setLoading(false)
    }
  }

  // Format the last updated time
  const formatLastUpdated = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    
    if (diffSecs < 60) return 'Just now'
    
    const diffMins = Math.floor(diffSecs / 60)
    if (diffMins === 1) return '1 minute ago'
    if (diffMins < 60) return `${diffMins} minutes ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours === 1) return '1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays} days ago`
  }

  const sortCreators = (creators: CreatorPerformance[], direction: 'asc' | 'desc' = 'desc', sortOption: CreatorSortOption) => {
    let sortedCreators = [...creators]
    
    sortedCreators.sort((a, b) => {
      let result = 0
      
      // Sort by the selected option
      switch (sortOption) {
        case 'tokens':
          result = b.totalTokens - a.totalTokens
          break
        case 'active':
          result = b.activeTokens - a.activeTokens
          break
        case 'volume':
          result = b.totalVolume - a.totalVolume
          break
        case 'success':
          result = b.successRate - a.successRate
          break
        case 'weighted':
          result = b.weightedScore - a.weightedScore
          break
        case 'confidence':
          result = b.confidenceScore - a.confidenceScore
          // If confidence scores are equal, sort by marketcap as secondary criterion
          if (result === 0) {
            result = b.totalMarketcap - a.totalMarketcap
          }
          break
        case 'holders':
          const aHolders = a.totalHolders || 0
          const bHolders = b.totalHolders || 0
          result = bHolders - aHolders
          break
        default:
          result = b.confidenceScore - a.confidenceScore // Default: confidence score
          // If confidence scores are equal, sort by marketcap as secondary criterion
          if (result === 0) {
            result = b.totalMarketcap - a.totalMarketcap
          }
      }
      
      // Reverse the result if ascending order is requested
      return direction === 'asc' ? -result : result
    })
    
    console.log(`Sorted ${sortedCreators.length} creators by ${sortOption} in ${direction} order`)
    
    // Update ranks after sorting
    sortedCreators = sortedCreators.map((creator, index) => ({
      ...creator,
      rank: index + 1
    }))
    
    // Filter based on search
    filterCreators(sortedCreators)
    
    return sortedCreators
  }

  const filterCreators = (sortedCreators = creators) => {
    // Apply search filter if search query exists
    let filtered = sortedCreators;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = sortedCreators.filter(creator => 
        // Search by developer name
        creator.username.toLowerCase().includes(query) ||
        // Search by principal ID
        creator.principal.toLowerCase().includes(query) ||
        // Search by token names
        (creator.tokens && creator.tokens.some(token => 
          token.name.toLowerCase().includes(query)
        ))
      );
    }
    setDisplayedCreators(filtered);
    console.log(`Filtered to ${filtered.length} creators`);
    
    // Reset to first page when filtering changes
    setCurrentPage(1);
  }

  const updatePaginatedCreators = () => {
    const indexOfLastCreator = currentPage * creatorsPerPage
    const indexOfFirstCreator = indexOfLastCreator - creatorsPerPage
    const currentCreators = displayedCreators.slice(indexOfFirstCreator, indexOfLastCreator)
    
    setPaginatedCreators(currentCreators)
    setTotalPages(Math.ceil(displayedCreators.length / creatorsPerPage))
  }

  const handleSortChange = (newSortBy: CreatorSortOption) => {
    if (newSortBy === sortBy) {
      // Toggle sort direction if clicking the same sort option
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')
    } else {
      // Default to descending order for new sort option
      setSortBy(newSortBy)
      setSortDirection('desc')
    }
    
    // Reset to first page when sort changes
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleCreatorsPerPageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value, 10)
    setCreatorsPerPage(value)
    setCurrentPage(1) // Reset to first page when changing items per page
  }

  // Get sort direction arrow
  const getSortArrow = (option: CreatorSortOption) => {
    if (option !== sortBy) return null
    
    return (
      <span className="sort-arrow">
        {sortDirection === 'desc' ? '↓' : '↑'}
      </span>
    )
  }

  // Generate pagination controls
  const renderPagination = () => {
    if (totalPages <= 1) return null
    
    const pageNumbers: number[] = []
    
    // Always show first page
    pageNumbers.push(1)
    
    // Show current page and pages around it
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (!pageNumbers.includes(i)) {
        pageNumbers.push(i)
      }
    }
    
    // Always show last page
    if (totalPages > 1) {
      pageNumbers.push(totalPages)
    }
    
    // Sort page numbers
    pageNumbers.sort((a, b) => a - b)
    
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
          
          {pageNumbers.map((page, index) => {
            // Add ellipsis if there's a gap
            if (index > 0 && page > pageNumbers[index - 1] + 1) {
              return (
                <span key={`ellipsis-${index}`}>
                  <span className="pagination-ellipsis">...</span>
                  <button 
                    key={page} 
                    className={`pagination-button ${currentPage === page ? 'active' : ''}`}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </button>
                </span>
              )
            }
            
            return (
              <button 
                key={page} 
                className={`pagination-button ${currentPage === page ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            )
          })}
          
          <button 
            className="pagination-button next" 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next &raquo;
          </button>
          
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
        </div>
        
        <div className="pagination-options">
          <label htmlFor="creatorsPerPage">Creators per page:</label>
          <select 
            id="creatorsPerPage" 
            value={creatorsPerPage} 
            onChange={handleCreatorsPerPageChange}
            className="creators-per-page-select"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Top 100 Developers</h1>
        <p className="dashboard-description">
          Track the most successful token creators on Odin.fun with our confidence score system
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
      </div>
      
      <div className="sort-options-container">
        <div className="sort-options">
          <span className="sort-label">Sort by:</span>
          <div className="sort-buttons">
            <button 
              className={`sort-button ${sortBy === 'confidence' ? 'active' : ''}`}
              onClick={() => handleSortChange('confidence')}
            >
              Confidence {getSortArrow('confidence')}
            </button>
            <button 
              className={`sort-button ${sortBy === 'volume' ? 'active' : ''}`}
              onClick={() => handleSortChange('volume')}
            >
              Volume {getSortArrow('volume')}
            </button>
            <button 
              className={`sort-button ${sortBy === 'active' ? 'active' : ''}`}
              onClick={() => handleSortChange('active')}
            >
              Active Tokens {getSortArrow('active')}
            </button>
            <button 
              className={`sort-button ${sortBy === 'success' ? 'active' : ''}`}
              onClick={() => handleSortChange('success')}
            >
              Success Rate {getSortArrow('success')}
            </button>
            <button 
              className={`sort-button ${sortBy === 'tokens' ? 'active' : ''}`}
              onClick={() => handleSortChange('tokens')}
            >
              Total Tokens {getSortArrow('tokens')}
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
      
      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading developers...</p>
        </div>
      ) : error ? (
        <div className="error">
          <p>{error}</p>
          <p>Maybe you are rate limited, wait a bit</p>
        </div>
      ) : displayedCreators.length === 0 ? (
        <div className="empty-state">
          <p>No developers found matching your search criteria.</p>
          <p>Try adjusting your search.</p>
        </div>
      ) : (
        <>
          <div className="creator-list">
            {paginatedCreators.map((creator) => (
              <CreatorCard 
                key={creator.principal} 
                creator={creator}
              />
            ))}
          </div>
          
          {renderPagination()}
        </>
      )}
      
      <div className="last-updated-footer">
        <span className="last-updated">
          {lastUpdated ? `Last updated: ${displayTime}` : ''}
        </span>
      </div>
    </div>
  )
} 