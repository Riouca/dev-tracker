import { useState, useEffect, ChangeEvent } from 'react'
import { findTopCreators, CreatorPerformance, CreatorSortOption, getBTCPrice } from '../services/api'
import CreatorCard from './CreatorCard'

export function Dashboard() {
  const [creators, setCreators] = useState<CreatorPerformance[]>([])
  const [displayedCreators, setDisplayedCreators] = useState<CreatorPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<CreatorSortOption>('confidence')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [followedCreatorsCount, setFollowedCreatorsCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'top' | 'followed'>('top')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [displayTime, setDisplayTime] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [usdPrice, setUsdPrice] = useState<number | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [creatorsPerPage, setCreatorsPerPage] = useState(20)
  const [paginatedCreators, setPaginatedCreators] = useState<CreatorPerformance[]>([])
  const [totalPages, setTotalPages] = useState(1)

  // Update followed creators count when localStorage changes
  useEffect(() => {
    const updateFollowedCount = () => {
      const followedCreators = JSON.parse(localStorage.getItem('followedCreators') || '[]')
      setFollowedCreatorsCount(followedCreators.length)
    }

    // Initial count
    updateFollowedCount()

    // Listen for changes
    window.addEventListener('storage', updateFollowedCount)
    return () => {
      window.removeEventListener('storage', updateFollowedCount)
    }
  }, [])

  // Load creators on initial render and auto-refresh every 20 minutes
  useEffect(() => {
    // Initial load with force refresh to ensure fresh data on app startup
    loadCreators(true);
    
    // Set up polling every 20 minutes (1200000 ms)
    const intervalId = setInterval(() => {
      console.log('Auto-refreshing dashboard data...');
      loadCreators(true);  // Force refresh every 20 minutes
    }, 1200000); // 20 minutes
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Sort creators when sortBy, sortDirection, or creators change
  useEffect(() => {
    if (creators.length > 0) {
      sortCreators(sortBy, sortDirection)
    }
  }, [sortBy, sortDirection, creators])

  // Filter creators when activeTab changes
  useEffect(() => {
    if (creators.length > 0) {
      filterCreators()
    }
  }, [activeTab, creators])

  // Update paginated creators when displayedCreators or currentPage changes
  useEffect(() => {
    updatePaginatedCreators()
  }, [displayedCreators, currentPage, creatorsPerPage])

  // Check for cached timestamp
  useEffect(() => {
    const cachedTimestamp = sessionStorage.getItem('forseti_creators_cache_timestamp')
    if (cachedTimestamp) {
      setLastUpdated(new Date(parseInt(cachedTimestamp, 10)))
    }
  }, [])

  // Update filtered creators when search query changes
  useEffect(() => {
    if (creators.length > 0) {
      filterCreators()
    }
  }, [searchQuery, creators])

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

  const loadCreators = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the findTopCreators API function with forceRefresh parameter
      // Don't force refresh on normal user interactions, only on scheduled refresh
      let tempCreators = await findTopCreators(200, 'confidence', forceRefresh);
      
      // Filter out creators with no username
      tempCreators = tempCreators.filter(creator => creator.username);
      
      // Get BTC price for USD conversion
      try {
        const btcPrice = await getBTCPrice();
        setUsdPrice(btcPrice);
      } catch (priceError) {
        console.error('Error fetching BTC price:', priceError);
      }
      
      setCreators(tempCreators);
      setLastUpdated(new Date());
      setLoading(false);
      setIsInitialLoad(false);
      
      // Initial filter and pagination
      filterCreators(tempCreators);
      updatePaginatedCreators();
    } catch (error) {
      console.error('Failed to load creators:', error);
      setError('Failed to load data. Please try again later.');
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

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

  const sortCreators = (sortOption: CreatorSortOption, direction: 'asc' | 'desc' = 'desc') => {
    let sortedCreators = [...creators]
    
    const sortFn = (a: CreatorPerformance, b: CreatorPerformance): number => {
      let result = 0;
      
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
      }
      
      // Reverse the result if ascending order
      return direction === 'asc' ? -result : result
    }
    
    sortedCreators.sort(sortFn)
    
    // Update ranks after sorting
    sortedCreators = sortedCreators.map((creator, index) => ({
      ...creator,
      rank: index + 1
    }))
    
    console.log(`Sorted ${sortedCreators.length} creators by ${sortOption} in ${direction} order`)
    
    // Filter based on active tab
    filterCreators(sortedCreators)
  }

  const filterCreators = (sortedCreators = creators) => {
    if (activeTab === 'followed') {
      const followedCreators = JSON.parse(localStorage.getItem('followedCreators') || '[]')
      const filtered = sortedCreators.filter(creator => followedCreators.includes(creator.principal))
      setDisplayedCreators(filtered)
      console.log(`Filtered to ${filtered.length} followed creators`)
    } else {
      // Apply search filter if search query exists
      let filtered = sortedCreators
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        filtered = sortedCreators.filter(creator => 
          // Search by developer name
          creator.username.toLowerCase().includes(query) ||
          // Search by principal ID
          creator.principal.toLowerCase().includes(query)
        )
      }
      setDisplayedCreators(filtered)
      console.log(`Filtered to ${filtered.length} top creators`)
    }
    
    // Reset to first page when filtering changes
    setCurrentPage(1)
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

  const handleTabChange = (tab: 'top' | 'followed') => {
    setActiveTab(tab)
    setCurrentPage(1) // Reset to first page when changing tabs
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
        <h1>Developer Performance Tracker</h1>
        <p className="dashboard-description">
          Track the most successful token creators on Odin.fun with our confidence score system
        </p>
      </div>
      
      <div className="dashboard-tabs">
        <button 
          className={`dashboard-tab ${activeTab === 'top' ? 'active' : ''}`}
          onClick={() => handleTabChange('top')}
        >
          Top Developers
        </button>
        <button 
          className={`dashboard-tab ${activeTab === 'followed' ? 'active' : ''}`}
          onClick={() => handleTabChange('followed')}
        >
          Followed
          {followedCreatorsCount > 0 && (
            <span className="badge">{followedCreatorsCount}</span>
          )}
        </button>
      </div>
      
      <div className="dashboard-actions">
        <div className="dashboard-actions-left">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search by developper or token name..."
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
          {activeTab === 'followed' ? (
            <>
              <p>You haven't followed any developers yet.</p>
              <p>Browse the top developers and click "Follow" to add them here.</p>
            </>
          ) : (
            <>
              <p>No developers found matching your search criteria.</p>
              <p>Try adjusting your search.</p>
            </>
          )}
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