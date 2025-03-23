import { useState, useEffect, ChangeEvent } from 'react'
import { calculateCreatorPerformance, CreatorPerformance, CreatorSortOption, getBTCPrice } from '../services/api'
import CreatorCard from './CreatorCard'

export function Favorites() {
  const [creators, setCreators] = useState<CreatorPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<CreatorSortOption>('confidence')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [displayTime, setDisplayTime] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [usdPrice, setUsdPrice] = useState<number | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [creatorsPerPage, setCreatorsPerPage] = useState(20)
  const [paginatedCreators, setPaginatedCreators] = useState<CreatorPerformance[]>([])
  const [totalPages, setTotalPages] = useState(1)

  // Load favorites on initial render and when localStorage changes
  useEffect(() => {
    loadFavorites()
    
    // Listen for changes in localStorage
    const handleStorageChange = () => {
      loadFavorites()
    }
    
    // Listen for custom follow events
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('followStatusChanged', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('followStatusChanged', handleStorageChange)
    }
  }, [])

  // Sort creators when sortBy or sortDirection changes
  useEffect(() => {
    if (creators.length > 0) {
      const sortedCreators = getSortedCreators(creators, sortBy, sortDirection)
      setCreators(sortedCreators)
    }
  }, [sortBy, sortDirection])

  // Update paginated creators when creators, currentPage, creatorsPerPage, or searchQuery changes
  useEffect(() => {
    updatePaginatedCreators()
  }, [creators, currentPage, creatorsPerPage, searchQuery])

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

  // Get BTC price for USD conversion
  useEffect(() => {
    const fetchBTCPrice = async () => {
      try {
        const price = await getBTCPrice()
        setUsdPrice(price)
      } catch (error) {
        console.error('Error fetching BTC price:', error)
      }
    }
    
    fetchBTCPrice()
  }, [])

  const loadFavorites = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get followed creators from localStorage
      const followedCreatorIds = JSON.parse(localStorage.getItem('followedCreators') || '[]')
      
      if (followedCreatorIds.length === 0) {
        setCreators([])
        setLoading(false)
        setLastUpdated(new Date())
        return
      }
      
      // Fetch data for each followed creator
      const creatorPromises = followedCreatorIds.map(
        (principal: string) => calculateCreatorPerformance(principal)
      )
      
      const creatorResults = await Promise.all(creatorPromises)
      let validCreators = creatorResults
        .filter((creator): creator is CreatorPerformance => creator !== null)
      
      // S'assurer que le tri est par défaut sur 'confidence' avec ordre descendant
      setSortBy('confidence')
      setSortDirection('desc')
      
      // Trier par score de confiance dès le chargement
      validCreators.sort((a, b) => {
        // Si les scores de confiance sont identiques, trier par volume
        if (b.confidenceScore === a.confidenceScore) {
          return b.totalVolume - a.totalVolume
        }
        return b.confidenceScore - a.confidenceScore
      })
      
      // Mettre à jour les rangs après le tri
      validCreators = validCreators.map((creator, index) => ({
        ...creator,
        rank: index + 1
      }))
      
      setCreators(validCreators)
      setLastUpdated(new Date())
      setLoading(false)
    } catch (error) {
      console.error('Failed to load favorites:', error)
      setError('Failed to load data. Please try again later.')
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

  // Get sorted creators without modifying the original array
  const getSortedCreators = (creatorsToSort: CreatorPerformance[], sortOption: CreatorSortOption, direction: 'asc' | 'desc'): CreatorPerformance[] => {
    let sortedCreators = [...creatorsToSort]
    
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
          // If confidence scores are equal, sort by volume as secondary criterion
          if (result === 0) {
            result = b.totalVolume - a.totalVolume
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
          // If confidence scores are equal, sort by volume as secondary criterion
          if (result === 0) {
            result = b.totalVolume - a.totalVolume
          }
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
    
    return sortedCreators
  }

  const updatePaginatedCreators = () => {
    // Filter creators by search query
    let filteredCreators = [...creators]
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filteredCreators = creators.filter(creator => 
        creator.username.toLowerCase().includes(query) ||
        creator.principal.toLowerCase().includes(query) ||
        (creator.tokens && creator.tokens.some(token => 
          token.name.toLowerCase().includes(query)
        ))
      )
    }
    
    const indexOfLastCreator = currentPage * creatorsPerPage
    const indexOfFirstCreator = indexOfLastCreator - creatorsPerPage
    const currentCreators = filteredCreators.slice(indexOfFirstCreator, indexOfLastCreator)
    
    setPaginatedCreators(currentCreators)
    setTotalPages(Math.ceil(filteredCreators.length / creatorsPerPage))
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
          <p className="loading-text">Loading favorites...</p>
        </div>
      ) : error ? (
        <div className="error">
          <p>{error}</p>
          <p>Maybe you are rate limited, wait a bit</p>
        </div>
      ) : creators.length === 0 ? (
        <div className="empty-state">
          <p>You haven't followed any developers yet.</p>
          <p>Browse the top developers and click "Follow" to add them here.</p>
        </div>
      ) : (
        <>
          <div className="creator-list">
            {paginatedCreators.map((creator) => (
              <CreatorCard 
                key={creator.principal} 
                creator={creator}
                btcPrice={usdPrice || undefined}
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