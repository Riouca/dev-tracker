import { useState, useEffect, ChangeEvent } from 'react'
import { findTopCreators, CreatorPerformance, CreatorSortOption } from '../services/api'
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
  const [searchQuery, setSearchQuery] = useState('')
  
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

  // Load creators on initial render
  useEffect(() => {
    // Use a small timeout to ensure the component is fully mounted
    const timer = setTimeout(() => {
      loadCreators(false)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

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

  const loadCreators = async (forceRefresh = false) => {
    // Create a flag to track if the component is still mounted
    let isMounted = true;
    
    try {
      setLoading(true)
      setError(null)
      
      console.log('Loading creators...')
      
      // If forceRefresh is true, clear the cache
      if (forceRefresh) {
        sessionStorage.removeItem('forseti_creators_cache')
        sessionStorage.removeItem('forseti_creators_cache_timestamp')
      }
      
      // Load creators with a higher limit to show more developers
      const topCreators = await findTopCreators(200, 'confidence')
      console.log(`Loaded ${topCreators.length} creators`)
      
      // Check if component is still mounted before updating state
      if (!isMounted) return;
      
      
      // Check if component is still mounted before updating state
      if (!isMounted) return;
      
      if (topCreators.length === 0) {
        setError('No creators found. Please try again later.')
      } else {
        setCreators(topCreators)
        console.log(`Set ${topCreators.length} creators in state`)
        
        // Update last updated timestamp
        const now = new Date()
        setLastUpdated(now)
        
        // Store timestamp in session storage
        sessionStorage.setItem('forseti_creators_cache_timestamp', now.getTime().toString())
      }
    } catch (err) {
      console.error('Error loading creators:', err)
      // Check if component is still mounted before updating state
      if (isMounted) {
        setError('Failed to load creators')
      }
    } finally {
      // Check if component is still mounted before updating state
      if (isMounted) {
        setLoading(false)
      }
    }
    
    // Return a cleanup function that sets isMounted to false
    return () => {
      isMounted = false;
    };
  }

  // Format the last updated time
  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  }

  const handleRefresh = () => {
    loadCreators(true) // Always force refresh
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
          <span className="last-updated">
            {lastUpdated ? `Last updated: ${formatLastUpdated(lastUpdated)}` : ''}
          </span>
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
      
      {loading && paginatedCreators.length === 0 ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading developers...</p>
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
              <p>Try adjusting your search or refreshing the data.</p>
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
                onUpdate={() => filterCreators()}
              />
            ))}
          </div>
          
          {renderPagination()}
          
          <div className="refresh-container">
            <button 
              className="refresh-button"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </>
      )}
    </div>
  )
} 