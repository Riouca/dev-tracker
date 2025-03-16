import { useState, useEffect } from 'react'
import { calculateCreatorPerformance, CreatorPerformance } from '../services/api'
import CreatorCard from './CreatorCard'

export function FollowedCreatorsList() {
  const [creators, setCreators] = useState<CreatorPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadFollowedCreators() {
      try {
        setLoading(true)
        
        // Get followed creators from localStorage
        const followedCreatorIds = JSON.parse(localStorage.getItem('followedCreators') || '[]')
        
        if (followedCreatorIds.length === 0) {
          setCreators([])
          setLoading(false)
          return
        }
        
        // Fetch data for each followed creator
        const creatorPromises = followedCreatorIds.map(
          (principal: string) => calculateCreatorPerformance(principal)
        )
        
        const creatorResults = await Promise.all(creatorPromises)
        const validCreators = creatorResults.filter((creator): creator is CreatorPerformance => creator !== null)
        
        // Sort by active tokens count
        const sortedCreators = validCreators.sort((a, b) => b.activeTokens - a.activeTokens)
        
        setCreators(sortedCreators)
        setError(null)
      } catch (err) {
        setError('Failed to load followed creators')
        console.error('Error loading followed creators:', err)
      } finally {
        setLoading(false)
      }
    }

    loadFollowedCreators()
    
    // Also reload when storage changes (when a creator is followed/unfollowed)
    const handleStorageChange = () => {
      loadFollowedCreators()
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  if (loading) {
    return (
      <div className="loading">
        Loading followed creators...
      </div>
    )
  }

  if (error) {
    return (
      <div className="error">
        {error}
      </div>
    )
  }

  if (creators.length === 0) {
    return (
      <div className="empty-state">
        <p>You haven't followed any creators yet.</p>
        <p>Click the star icon on a creator card to follow them.</p>
      </div>
    )
  }

  return (
    <div className="creator-list">
      {creators.map(creator => (
        <CreatorCard 
          key={creator.principal} 
          creator={creator}
        />
      ))}
    </div>
  )
} 