import { useState, useEffect, useRef } from 'react'
import { 
  formatVolume, 
  formatMarketcap,
  getBTCPrice,
  Token as ApiToken,
  getRarityLevel,
  CreatorPerformance
} from '../services/api'
import { useNewestTokens, useOlderRecentTokens, useFollowedCreatorsTokens, useFavorites, useBTCPrice } from '../services/queries'
import CreatorCard from './CreatorCard'

interface TokenWithCreator {
  token: ApiToken;
  creator: CreatorPerformance | null;
}

// Filter tokens by creator confidence
const filterTokensByConfidence = (tokens: TokenWithCreator[], confidenceFilter: string): TokenWithCreator[] => {
  if (confidenceFilter === 'all') {
    return tokens;
  }
  
  return tokens.filter(({ creator }) => {
    if (!creator) return false;
    
    const score = creator.confidenceScore;
    const level = getRarityLevel(score);
    return level === confidenceFilter;
  });
};

export function RecentTokens() {
  // State
  const [expandedCreator, setExpandedCreator] = useState<string | null>(null)
  const [expandedToken, setExpandedToken] = useState<string | null>(null)
  const [displayInUSD, setDisplayInUSD] = useState(true)
  const [confidenceFilter, setConfidenceFilter] = useState('all')
  
  // References
  const starburst = useRef<HTMLDivElement>(null)
  const creatorCardRefs = useRef<Record<string, HTMLDivElement>>({})
  
  // Fetch data using React Query
  const { 
    data: newestTokens = [], 
    isLoading: isLoadingNewest,
    error: newestError
  } = useNewestTokens()
  
  const { 
    data: olderTokens = [], 
    isLoading: isLoadingOlder,
    error: olderError
  } = useOlderRecentTokens()
  
  // Fetch BTC price using React Query
  const { data: btcPrice } = useBTCPrice()
  
  // Favorites functionality
  const { getFavorites, isFavorite, addFavorite, removeFavorite } = useFavorites()
  const followedCreators = getFavorites()
  
  // Get tokens from followed creators (if any)
  const { 
    data: followedCreatorTokens = [], 
    isLoading: isLoadingFollowed,
    error: followedError
  } = useFollowedCreatorsTokens(followedCreators)
  
  // Combine the newest and older tokens
  const allTokens = [...(newestTokens || []), ...(olderTokens || [])]
  
  // Expanded token card for each token in the view
  const [expandedTokens, setExpandedTokens] = useState<Record<string, boolean>>({})
  const [tokenCreators, setTokenCreators] = useState<Record<string, CreatorPerformance | null>>({})
  
  // Keep track of expanded tokens
  useEffect(() => {
    const newExpandedTokens: Record<string, boolean> = {}
    allTokens.forEach(token => {
      // Preserve existing expansion state or default to false
      newExpandedTokens[token.id] = expandedTokens[token.id] || false
    })
    setExpandedTokens(newExpandedTokens)
  }, [allTokens])
  
  // Filter tokens by confidence score
  const filteredTokens = filterTokensByConfidence(
    allTokens.map(token => ({ 
      token, 
      creator: tokenCreators[token.id] || null 
    })), 
    confidenceFilter
  )
  
  // Toggle expanded state for a creator
  const toggleExpandCreator = (principal: string, tokenId: string) => {
    if (expandedCreator === principal) {
      setExpandedCreator(null)
      } else {
      setExpandedCreator(principal)
      setExpandedToken(tokenId)
    }
  }
  
  // Toggle display between USD and BTC
  const toggleVolumeDisplay = () => {
    setDisplayInUSD(!displayInUSD)
  }
  
  // Format token volume for display
  const formatTokenVolumeDisplay = (volume: number) => {
    if (btcPrice) {
      const btcVolume = volume / 100000000 / 1000
      const usdVolume = btcVolume * btcPrice
      
      if (displayInUSD) {
        if (usdVolume >= 1000000) {
          return `$${(usdVolume / 1000000).toFixed(1)}M`
        } else if (usdVolume >= 1000) {
          return `$${(usdVolume / 1000).toFixed(1)}K`
        } else {
          return `$${usdVolume.toFixed(0)}`
        }
      } else {
        return formatVolume(volume)
      }
    } else {
      return formatVolume(volume, displayInUSD)
    }
  }
  
  // Format token marketcap for display
  const formatTokenMarketcapDisplay = (marketcap: number) => {
    if (btcPrice) {
      const btcMarketcap = marketcap / 100000000 / 1000
      const usdMarketcap = btcMarketcap * btcPrice
      
      if (displayInUSD) {
        if (usdMarketcap >= 1000000) {
          return `$${(usdMarketcap / 1000000).toFixed(1)}M`
        } else if (usdMarketcap >= 1000) {
          return `$${(usdMarketcap / 1000).toFixed(1)}K`
        } else {
          return `$${usdMarketcap.toFixed(0)}`
        }
      } else {
        return formatMarketcap(marketcap)
      }
    } else {
      return formatMarketcap(marketcap, displayInUSD)
    }
  }
  
  // Get color based on creator confidence score
  const getRarityColor = (score: number): string => {
    const level = getRarityLevel(score)
    
    switch (level) {
      case 'legendary': return 'text-yellow-400'
      case 'epic': return 'text-purple-400'
      case 'great': return 'text-blue-400'
      case 'okay': return 'text-green-400'
      case 'neutral': return 'text-gray-100'
      case 'meh': return 'text-amber-600'
      default: return 'text-amber-700'
    }
  }
  
  // Handle follow/unfollow creator
  const toggleFollowCreator = (principal: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (isFavorite(principal)) {
      removeFavorite(principal)
    } else {
      addFavorite(principal)
        createStarBurst(e)
    }
  }
  
  // Create star burst animation when following a creator
  const createStarBurst = (e: React.MouseEvent) => {
    if (!starburst.current) return
    
    const burstElement = starburst.current
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    // Position the burst container
    burstElement.style.left = `${centerX}px`
    burstElement.style.top = `${centerY}px`
    
    // Create stars
    burstElement.innerHTML = ''
    const colors = ['#FFD700', '#FFC107', '#FFEB3B', '#FFEE58', '#FFF176']
    
    for (let i = 0; i < 20; i++) {
      const star = document.createElement('div')
      star.className = 'star-particle'
      
      // Random position and angle
      const angle = Math.random() * Math.PI * 2
      const distance = 20 + Math.random() * 80
      
      // Set styles
      star.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
      star.style.top = '0px'
      star.style.left = '0px'
      star.style.transform = `rotate(${Math.random() * 360}deg) translate(${distance}px, 0)`
      
      // Append star
      burstElement.appendChild(star)
    }
    
    // Trigger animation restart by removing and adding class
    burstElement.classList.remove('animate-stars')
    void burstElement.offsetWidth // Force reflow
    burstElement.classList.add('animate-stars')
  }
  
  // Is there any loading happening?
  const isLoading = isLoadingNewest || isLoadingOlder || isLoadingFollowed
  
  // Are there any errors?
  const hasErrors = newestError || olderError || followedError

  return (
    <div className="recent-tokens-container">
      <div className="section-title">
        <h1>Recent Tokens</h1>
        <p className="section-description">
          All recently launched tokens on Odin
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
            <button 
              className="currency-toggle-button"
            onClick={toggleVolumeDisplay}
            title={displayInUSD ? "Switch to BTC" : "Switch to USD"}
            >
            {displayInUSD ? '$ → ₿' : '₿ → $'}
            </button>
          </div>
        </div>
        
      {isLoading && (
          <div className="loading">
            <div className="loading-spinner"></div>
          <div className="loading-text">Loading tokens...</div>
          </div>
      )}
      
      {hasErrors && (
          <div className="error">
          <p>Error loading tokens. Please try again later.</p>
          </div>
      )}
      
      {!isLoading && !hasErrors && filteredTokens.length === 0 && (
          <div className="empty-state">
          <p>No tokens found matching your filter criteria.</p>
          <p>Try adjusting your filters.</p>
          </div>
      )}
      
      {!isLoading && !hasErrors && filteredTokens.length > 0 && (
        <div className="recent-token-list">
            {filteredTokens.map(({ token, creator }) => (
              <div 
                key={token.id} 
              className={`recent-token-card ${expandedCreator === token.creator ? 'expanded' : ''} ${token.is_active ? 'active-token' : 'inactive-token'}`}
            >
              <div className="recent-token-header">
                <div className="token-image-large">
                  <img 
                    src={`https://images.odin.fun/token/${token.id}`} 
                        alt={token.name} 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                      // Replace with generic icon
                          target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>';
                        }}
                      />
                    </div>
                
                <div className="recent-token-info">
                  <div className="recent-token-name">
                    <a 
                      href={`https://odin.fun/token/${token.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                          {token.name}
                      <svg 
                        className="external-link-icon" 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="12" 
                        height="12" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                              <polyline points="15 3 21 3 21 9"></polyline>
                              <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                    </a>
                    <div className="recent-token-created">
                      {new Date(token.created_time).toLocaleString()}
                        </div>
                      </div>
                  
                  <div className="recent-token-price">
                    <span className="price-value">{token.price_in_sats || 0} sats</span>
                    {token.is_active ? (
                      <span className="token-status-badge active">Active</span>
                    ) : (
                      <span className="token-status-badge inactive" title={token.inactive_reason}>
                        Inactive
                      </span>
                        )}
                      </div>
                    </div>
              </div>
              
              <div className="recent-token-stats">
                <div className="recent-token-stat">
                  <div className="stat-label">Volume</div>
                  <div className="stat-value">
                    {formatTokenVolumeDisplay(token.volume)}
                  </div>
                </div>
                
                <div className="recent-token-stat">
                    <div className="stat-label">Marketcap</div>
                  <div className="stat-value">
                    {formatTokenMarketcapDisplay(token.marketcap)}
                  </div>
                </div>
                
                <div className="recent-token-stat">
                  <div className="stat-label">Holders</div>
                  <div className="stat-value">{token.holder_count.toLocaleString()}</div>
                    </div>
                
                <div className="recent-token-stat">
                  <div className="stat-label">Trades</div>
                  <div className="stat-value">
                    {(token.buy_count + token.sell_count).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
              {token.description && (
                <div className="recent-token-description">
                  <p>{token.description}</p>
                </div>
              )}
              
              <div 
                className={`token-creator-info ${expandedCreator === token.creator ? 'expanded' : ''}`}
                onClick={() => toggleExpandCreator(token.creator, token.id)}
                ref={(el) => { if (el) creatorCardRefs.current[token.creator] = el }}
              >
                <div className="creator-summary">
                  <div className="creator-avatar-small">
                    <img 
                      src={`https://images.odin.fun/user/${token.creator}`}
                      alt="Creator"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.onerror = null;
                        target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="8" r="5"/><path d="M3,21 h18 C 21,12 3,12 3,21"/></svg>';
                                      }}
                                    />
                                  </div>
                  
                  <div className="creator-info-small">
                    <div className="creator-name-small">
                      <a 
                        href={`https://odin.fun/user/${token.creator}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {creator?.username || token.creator.substring(0, 8)}
                        <svg 
                          className="external-link-icon small" 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="10" 
                          height="10" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                          <polyline points="15 3 21 3 21 9"></polyline>
                                          <line x1="10" y1="14" x2="21" y2="3"></line>
                                        </svg>
                      </a>
                      
                      {creator && (
                        <div className={`creator-label ${getRarityColor(creator.confidenceScore)}`}>
                          {getRarityLevel(creator.confidenceScore)}
                                    </div>
                      )}
                                </div>
                              </div>
                              
                  <button
                    className={`follow-button ${isFavorite(token.creator) ? 'following' : ''}`}
                    onClick={(e) => toggleFollowCreator(token.creator, e)}
                    title={isFavorite(token.creator) ? "Unfollow Creator" : "Follow Creator"}
                  >
                    {isFavorite(token.creator) ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                      </svg>
                    )}
                  </button>
                  </div>
                
                <div className="expand-indicator">
                  {expandedCreator === token.creator ? 'Hide Details' : 'Show Developer Details'}
                    </div>
                  </div>
              
              {expandedCreator === token.creator && creator && (
                <div className="creator-expanded-content">
                  <CreatorCard creator={creator} btcPrice={btcPrice} />
                </div>
              )}
                
              <div className="token-social-icons">
                {token.twitter && (
                  <a 
                    href={token.twitter} 
                    className="token-social-icon twitter" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    title="Twitter"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231L17.79 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                )}
                
                {token.website && (
                  <a 
                    href={token.website} 
                    className="token-social-icon website" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    title="Website"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                  </a>
                )}
                
                {token.telegram && (
                  <a 
                    href={token.telegram} 
                    className="token-social-icon telegram" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    title="Telegram"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.06-.2-.07-.06-.18-.04-.25-.02-.11.02-1.84 1.17-5.21 3.42-.49.33-.94.5-1.35.48-.44-.02-1.3-.25-1.93-.46-.78-.26-1.39-.4-1.34-.85.03-.22.32-.46.88-.7 3.49-1.52 5.82-2.53 6.99-3.01 3.33-1.38 4.02-1.62 4.47-1.63.1 0 .33.02.47.12.12.08.2.21.22.33.03.14.01.3-.03.63z"/>
                    </svg>
                  </a>
                  )}
                </div>
              
              <a 
                href={`https://odin.fun/token/${token.id}`}
                className="view-token-button"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Odin
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
              </div>
            ))}
          </div>
        )}
      
      {/* Star burst container for follow animation */}
      <div ref={starburst} className="star-container"></div>
    </div>
  )
}