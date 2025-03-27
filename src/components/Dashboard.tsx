import { useState, useEffect, ChangeEvent, useContext, useRef } from 'react'
import { findTopCreators, CreatorPerformance, CreatorSortOption } from '../services/api'
import CreatorCard from './CreatorCard'
import { PreloadContext } from '../App'
import { useTopCreators } from '../hooks/useTokenQueries'

export function Dashboard() {
  // Context for preloaded data
  const { dashboardData: preloadedData, updateDashboardData, lastDashboardUpdate } = useContext(PreloadContext)
  
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
  
  // Référence pour suivre l'état de tri précédent - DÉPLACÉ ICI AU NIVEAU RACINE
  const sortRefState = useRef({
    sortBy: "",
    sortDirection: "",
    dataHash: ""
  });

  // React Query hook for top creators
  const { 
    data, 
    isLoading: queryLoading, 
    isError: queryError,
    dataUpdatedAt
  } = useTopCreators(100, sortBy, false, {
    // Only fetch if no preloaded data
    enabled: !preloadedData || preloadedData.length === 0,
  });

  // Cast data to proper type
  const creators = data as CreatorPerformance[] || [];

  // Update context when data changes
  useEffect(() => {
    if (creators && creators.length > 0) {
      // Filter out creators with no username
      const validData = creators.filter(creator => creator.username);
      // Update context for other components
      updateDashboardData(validData);
      // Update last updated time
      setLastUpdated(new Date(dataUpdatedAt || Date.now()));
      setSilentlyUpdating(false);
      setLoading(false);
    }
  }, [creators, dataUpdatedAt, updateDashboardData]);

  // Handle query errors
  useEffect(() => {
    if (queryError) {
      // On error, don't show error state if we have preloaded data
      if (!preloadedData || preloadedData.length === 0) {
        setError('Failed to load creators. Please try again later.');
      }
      setSilentlyUpdating(false);
      setLoading(false);
    }
  }, [queryError, preloadedData]);

  // Use preloaded data if available
  useEffect(() => {
    if (preloadedData && preloadedData.length > 0) {
      console.log('Using preloaded dashboard data')
      setDisplayedCreators(sortCreators(preloadedData, sortDirection, sortBy))
      setLoading(false)
      setLastUpdated(lastDashboardUpdate || new Date())
      
      // If data is older than 5 minutes, trigger a silent refresh
      const now = new Date()
      const isFresh = lastDashboardUpdate && (now.getTime() - lastDashboardUpdate.getTime() < 5 * 60 * 1000)
      
      if (!isFresh && !silentlyUpdating) {
        silentlyLoadData()
      }
    }
  }, [preloadedData, lastDashboardUpdate, sortDirection, sortBy, silentlyUpdating])

  // Update creators when React Query data changes
  useEffect(() => {
    if (creators && creators.length > 0) {
      // Only update if we have new data that's different
      if (!preloadedData || 
          preloadedData.length === 0 || 
          preloadedData[0]?.principal !== creators[0]?.principal) {
        setDisplayedCreators(sortCreators(creators, sortDirection, sortBy))
        if (dataUpdatedAt) {
          setLastUpdated(new Date(dataUpdatedAt))
        }
      }
    }
  }, [creators, dataUpdatedAt, sortDirection, sortBy, preloadedData])

  // Method to silently load data without showing loading state
  const silentlyLoadData = () => {
    if (silentlyUpdating) return // Avoid parallel loads
    setSilentlyUpdating(true)
    // This will trigger the React Query hook to refetch
    // The onSuccess callback will update the state
  }

  // Sort creators when sortBy, sortDirection, or creators change
  useEffect(() => {
    // Éviter le traitement si nous n'avons pas de données
    if (!((preloadedData && preloadedData.length > 0) || (creators && creators.length > 0))) {
      return;
    }
    
    // Utiliser la référence déclarée au niveau racine
    
    // Créer un hash simple des données actuelles pour détecter les changements
    const dataToSort = creators.length > 0 ? creators : preloadedData;
    const dataHash = dataToSort.map(c => c.principal).join('-');
    
    // Ne trier que si quelque chose a changé
    if (sortRefState.current.sortBy === sortBy && 
        sortRefState.current.sortDirection === sortDirection && 
        sortRefState.current.dataHash === dataHash) {
      return;
    }
    
    // Use a setTimeout to debounce sorting operations
    const sortTimer = setTimeout(() => {
      console.log('Sorting creators with', sortBy, sortDirection);
      setDisplayedCreators(sortCreators(dataToSort, sortDirection, sortBy));
      
      // Mettre à jour la référence
      sortRefState.current = {
        sortBy,
        sortDirection,
        dataHash
      };
    }, 100);
    
    return () => clearTimeout(sortTimer);
  }, [sortBy, sortDirection, creators, preloadedData]);

  // Update displayed creators when search query changes
  useEffect(() => {
    // Éviter le traitement si nous n'avons pas de données ou pas de requête
    if (!displayedCreators.length || !searchQuery) {
      return;
    }
    
    // Debounce search filtering operations
    const searchTimer = setTimeout(() => {
      console.log('Filtering creators with query:', searchQuery);
      filterCreators();
    }, 150);
    
    return () => clearTimeout(searchTimer);
  }, [searchQuery, displayedCreators]);

  // Update paginated creators when displayedCreators or currentPage changes
  useEffect(() => {
    updatePaginatedCreators()
  }, [displayedCreators, currentPage, creatorsPerPage])

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

  const sortCreators = (creatorsToSort: CreatorPerformance[], direction: 'asc' | 'desc' = 'desc', sortOption: CreatorSortOption) => {
    let sortedCreators = [...creatorsToSort]
    
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
    
    return sortedCreators
  }

  const filterCreators = () => {
    // Get current data source
    const dataToFilter = creators.length > 0 ? creators : preloadedData
    
    // Apply search filter if search query exists
    let filtered = dataToFilter;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = dataToFilter.filter(creator => 
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

  // Set loading state based on React Query and local state
  const showLoading = loading || (queryLoading && (!preloadedData || preloadedData.length === 0))
  // Set error state 
  const showError = error || (queryError && (!preloadedData || preloadedData.length === 0))

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
      
      {showLoading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading developers...</p>
        </div>
      ) : showError ? (
        <div className="error">
          <p>{error || 'Failed to load creators. Please try again later.'}</p>
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