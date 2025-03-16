import { useState, useEffect } from 'react'
import { findTopCreators, CreatorPerformance, CreatorSortOption, fetchBobData } from '../services/api'
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
    loadCreators()
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

  const loadCreators = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Loading creators...')
      // Load creators
      const topCreators = await findTopCreators(100, 'confidence')
      console.log(`Loaded ${topCreators.length} creators`)
      
      // Try to fetch Bob's data specifically
      try {
        const bobData = await fetchBobData()
        if (bobData) {
          // Check if Bob is already in the list
          const bobIndex = topCreators.findIndex(c => c.principal === bobData.principal)
          
          if (bobIndex === -1) {
            // Bob not found, add him to the list
            topCreators.push(bobData)
            console.log('Added Bob to the creators list')
          } else {
            // Bob found, update his data
            topCreators[bobIndex] = bobData
            console.log('Updated Bob\'s data in the creators list')
          }
        }
      } catch (bobError) {
        console.error('Error fetching Bob data:', bobError)
      }
      
      if (topCreators.length === 0) {
        setError('No creators found. Please try again later.')
      } else {
        setCreators(topCreators)
        console.log(`Set ${topCreators.length} creators in state`)
      }
    } catch (err) {
      console.error('Error loading creators:', err)
      setError('Failed to load creators')
    } finally {
      setLoading(false)
    }
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
      setDisplayedCreators(sortedCreators)
      console.log(`Displaying all ${sortedCreators.length} creators`)
    }
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
  }

  const handleTabChange = (tab: 'top' | 'followed') => {
    setActiveTab(tab)
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

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Token Creators</h1>
        <p className="dashboard-description">
          Track the most successful token creators on Odin.fun
        </p>
      </div>
      
      <div className="dashboard-tabs">
        <button 
          className={`dashboard-tab ${activeTab === 'top' ? 'active' : ''}`}
          onClick={() => handleTabChange('top')}
        >
          Top Creators
        </button>
        <button 
          className={`dashboard-tab ${activeTab === 'followed' ? 'active' : ''}`}
          onClick={() => handleTabChange('followed')}
        >
          Followed Creators
          {followedCreatorsCount > 0 && (
            <span className="badge">{followedCreatorsCount}</span>
          )}
        </button>
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
              className={`sort-button ${sortBy === 'success' ? 'active' : ''}`}
              onClick={() => handleSortChange('success')}
            >
              Success Rate {getSortArrow('success')}
            </button>
            <button 
              className={`sort-button ${sortBy === 'volume' ? 'active' : ''}`}
              onClick={() => handleSortChange('volume')}
            >
              Volume {getSortArrow('volume')}
            </button>
            <button 
              className={`sort-button ${sortBy === 'tokens' ? 'active' : ''}`}
              onClick={() => handleSortChange('tokens')}
            >
              Tokens Created {getSortArrow('tokens')}
            </button>
            <button 
              className={`sort-button ${sortBy === 'holders' ? 'active' : ''}`}
              onClick={() => handleSortChange('holders')}
            >
              Total Holders {getSortArrow('holders')}
            </button>
            <button 
              className={`sort-button ${sortBy === 'active' ? 'active' : ''}`}
              onClick={() => handleSortChange('active')}
            >
              Active Tokens {getSortArrow('active')}
            </button>
          </div>
        </div>
      </div>
      
      <div className="dashboard-content">
        {loading && creators.length === 0 ? (
          <div className="loading">Loading top creators...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : displayedCreators.length === 0 ? (
          <div className="empty-state">
            {activeTab === 'followed' ? (
              <>
                <p>You haven't followed any creators yet.</p>
                <p>Star creators on the Top Creators tab to follow them.</p>
              </>
            ) : (
              <p>No creators found. Please try refreshing the page.</p>
            )}
          </div>
        ) : (
          <div className="creator-list">
            {displayedCreators.map(creator => (
              <CreatorCard key={creator.principal} creator={creator} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 