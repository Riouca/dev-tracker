import { useState, useEffect } from 'react'
import { 
  getUser, 
  getUserImageUrl, 
  getTokenImageUrl, 
  formatVolume, 
  formatMarketcap,
  convertPriceToSats, 
  isTokenActive,
  getBTCPrice,
  Token as ApiToken,
  getRarityLevel,
  CreatorPerformance,
  calculateCreatorPerformance,
  getRecentlyLaunchedTokens
} from '../services/api'
import { formatPrice, formatDate, formatNumber, getTimeSince } from '../utils/formatters'

interface TokenWithCreator {
  token: ApiToken;
  creator: CreatorPerformance | null;
}

export function RecentTokens() {
  const [tokens, setTokens] = useState<TokenWithCreator[]>([])
  const [filteredTokens, setFilteredTokens] = useState<TokenWithCreator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUSD, setShowUSD] = useState(true) // Default to USD display
  const [usdPrice, setUsdPrice] = useState<number | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [expandedCreator, setExpandedCreator] = useState<string | null>(null)
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all')

  const fetchRecentTokens = async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)
      
      // Use our new function to get recently launched tokens with 30-sec cache
      const recentTokens = await getRecentlyLaunchedTokens(15);
      
      // Process tokens and fetch creator data
      const tokensWithCreators: TokenWithCreator[] = []
      
      // Fetch creator performance for each token
      for (const token of recentTokens) {
        try {
          const creatorPerformance = await calculateCreatorPerformance(token.creator)
          tokensWithCreators.push({
            token: token,
            creator: creatorPerformance
          })
        } catch (err) {
          console.error(`Error fetching creator data for token ${token.id}:`, err)
          tokensWithCreators.push({
            token: token,
            creator: null
          })
        }
      }
      
      setTokens(tokensWithCreators)
      setFilteredTokens(tokensWithCreators)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error fetching recent tokens:', err)
      setError('Failed to fetch recent tokens. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  // Apply confidence filter
  useEffect(() => {
    if (tokens.length === 0) return
    
    if (confidenceFilter === 'all') {
      setFilteredTokens(tokens)
      return
    }
    
    // Filter tokens based on confidence score
    const filtered = tokens.filter(({ creator }) => {
      if (!creator) return false
      
      switch (confidenceFilter) {
        case 'legendary':
          return creator.confidenceScore >= 90
        case 'high':
          return creator.confidenceScore >= 70 && creator.confidenceScore < 90
        case 'medium':
          return creator.confidenceScore >= 50 && creator.confidenceScore < 70
        case 'low':
          return creator.confidenceScore < 50
        default:
          return true
      }
    })
    
    setFilteredTokens(filtered)
  }, [tokens, confidenceFilter])

  // Format token volume display
  const formatTokenVolumeDisplay = (volume: number) => {
    if (showUSD && usdPrice) {
      const btcVolume = volume / 100000000 / 1000; // Convert to BTC and divide by 1000
      const usdVolume = btcVolume * usdPrice;
      
      if (usdVolume >= 1000000) {
        return `$${(usdVolume / 1000000).toFixed(1)}M`;
      } else if (usdVolume >= 1000) {
        return `$${(usdVolume / 1000).toFixed(1)}K`;
      } else {
        return `$${usdVolume.toFixed(0)}`;
      }
    } else {
      return formatVolume(volume, false);
    }
  };

  // Format token marketcap display
  const formatTokenMarketcapDisplay = (marketcap: number) => {
    if (showUSD && usdPrice) {
      const btcMarketcap = marketcap / 100000000 / 1000; // Convert to BTC and divide by 1000
      const usdMarketcap = btcMarketcap * usdPrice;
      
      if (usdMarketcap >= 1000000) {
        return `$${(usdMarketcap / 1000000).toFixed(1)}M`;
      } else if (usdMarketcap >= 1000) {
        return `$${(usdMarketcap / 1000).toFixed(1)}K`;
      } else {
        return `$${usdMarketcap.toFixed(0)}`;
      }
    } else {
      return formatMarketcap(marketcap, false);
    }
  };

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
  };

  // Get rarity color for confidence score
  const getRarityColor = (score: number): string => {
    const level = getRarityLevel(score);
    switch (level) {
      case 'legendary': return 'text-yellow-400'; // Gold
      case 'epic': return 'text-purple-400';      // Purple
      case 'great': return 'text-blue-400';       // Blue
      case 'okay': return 'text-green-400';       // Green
      case 'neutral': return 'text-gray-100';     // White
      case 'meh': return 'text-gray-400';         // Gray
      case 'scam': return 'text-red-500';         // Red
      default: return 'text-red-500';             // Red
    }
  };

  // Toggle expanded creator
  const toggleExpandCreator = (principal: string) => {
    if (expandedCreator === principal) {
      setExpandedCreator(null);
    } else {
      setExpandedCreator(principal);
    }
  };

  // Fetch BTC price for USD conversion
  useEffect(() => {
    const fetchBTCPrice = async () => {
      try {
        const price = await getBTCPrice()
        setUsdPrice(price)
      } catch (err) {
        console.error('Error fetching BTC price:', err)
      }
    }
    fetchBTCPrice()
  }, [])

  // Initial fetch and auto-refresh every 10 seconds
  useEffect(() => {
    // Fetch on component mount
    fetchRecentTokens()
    
    // Set up polling every 10 seconds 
    const intervalId = setInterval(() => {
      console.log('Auto-refreshing recent tokens...')
      fetchRecentTokens()
    }, 10000)
    
    // Clear interval on component unmount
    return () => clearInterval(intervalId)
  }, [])

  return (
    <div className="recent-tokens-container">
      <div className="recent-tokens">
        <div className="dashboard-header">
          <h1>Recently Launched Tokens</h1>
          <p className="dashboard-description">
            Discover the newest tokens launched on Odin.fun with developer confidence scores
          </p>
        </div>
        
        <div className="dashboard-actions">
          <div className="dashboard-actions-left">
            <span className="last-updated">
              {lastUpdated ? `Last updated: ${formatLastUpdated(lastUpdated)}` : ''}
            </span>
            <div className="confidence-filter">
              <label htmlFor="confidence-filter">Filter by confidence:</label>
              <select 
                id="confidence-filter" 
                value={confidenceFilter}
                onChange={(e) => setConfidenceFilter(e.target.value)}
                className="confidence-select"
              >
                <option value="all">All Developers</option>
                <option value="legendary">Legendary (90%+)</option>
                <option value="high">High (70-89%)</option>
                <option value="medium">Medium (50-69%)</option>
                <option value="low">Low (Below 50%)</option>
              </select>
            </div>
          </div>
          <div className="dashboard-actions-right">
            <button 
              className="refresh-button"
              onClick={() => fetchRecentTokens(true)}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh Tokens'}
            </button>
            <button 
              className="currency-toggle-button"
              onClick={() => setShowUSD(!showUSD)}
            >
              Show in {showUSD ? 'BTC' : 'USD'}
            </button>
          </div>
        </div>
        
        {loading && tokens.length === 0 ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading recent tokens...</p>
          </div>
        ) : error ? (
          <div className="error">
            <p>Uh oh.. something went wrong</p>
            <p>Maybe you are rate limited, wait a bit</p>
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="empty-state">
            <p>No tokens match the selected confidence filter.</p>
            <p>Try selecting a different filter or refreshing the data.</p>
          </div>
        ) : (
          <div className="creator-list">
            {filteredTokens.map(({ token, creator }) => (
              <div 
                key={token.id} 
                className="creator-card"
              >
                <div className="creator-header compact" onClick={() => window.open(`https://odin.fun/token/${token.id}`, '_blank')}>
                  <div className="token-info">
                    <div className="token-image-wrapper large">
                      <img 
                        src={getTokenImageUrl(token.id)} 
                        alt={token.name} 
                        className="token-image" 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>';
                        }}
                      />
                    </div>
                    <div className="token-details">
                      <div className="token-title">
                        <h3 className="token-name large">{token.name}</h3>
                        <span className="token-ticker large">${token.ticker || token.name.substring(0, 4).toUpperCase()}</span>
                      </div>
                      <div className="token-metrics compact">
                        <div className="token-price large">
                          <span className="metric-label">Price:</span> 
                          <span>{formatPrice(token.price)}</span>
                        </div>
                        <div className="token-created large">
                          <span className="metric-label">Created:</span> 
                          <span>{getTimeSince(token.created_time)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="token-stats">
                  <div className="token-stat">
                    <div className="stat-value">{formatNumber(token.holder_count)}</div>
                    <div className="stat-label">Holders</div>
                  </div>
                  <div className="token-stat">
                    <div className="stat-value">{formatTokenVolumeDisplay(token.volume)}</div>
                    <div className="stat-label">Volume</div>
                  </div>
                  <div className="token-stat">
                    <div className="stat-value">{formatTokenMarketcapDisplay(token.marketcap)}</div>
                    <div className="stat-label">Marketcap</div>
                  </div>
                  <div className="token-stat">
                    <div className="stat-value">{formatNumber(token.buy_count + token.sell_count)}</div>
                    <div className="stat-label">Trades</div>
                  </div>
                </div>
                
                {creator ? (
                  <div 
                    className={`token-creator-info ${expandedCreator === creator.principal ? 'expanded' : ''}`}
                    onClick={() => creator && toggleExpandCreator(creator.principal)}
                  >
                    <div className="creator-summary">
                      <div className="creator-avatar">
                        {creator.image ? (
                          <img 
                            src={getUserImageUrl(creator.principal)} 
                            alt={creator.username} 
                          />
                        ) : (
                          <div className="creator-avatar-placeholder">
                            {creator.username[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="creator-info">
                        <div className="creator-name-wrapper">
                          <h3 className={`creator-name ${getRarityColor(creator.confidenceScore)}`}>
                            {creator.username}
                          </h3>
                          <span className={`rarity-badge ${getRarityColor(creator.confidenceScore)}`}>
                            {getRarityLevel(creator.confidenceScore).charAt(0).toUpperCase() + getRarityLevel(creator.confidenceScore).slice(1)}
                          </span>
                        </div>
                        <div className="creator-metrics">
                          <div className="confidence-score">
                            <span className="metric-label">Confidence:</span> 
                            <span className={getRarityColor(creator.confidenceScore)}>{creator.confidenceScore.toFixed(1)}%</span>
                          </div>
                          <div className="creator-tokens">
                            <span className="metric-label">Tokens:</span> 
                            <span>{creator.activeTokens}/{creator.totalTokens}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {expandedCreator === creator.principal && (
                      <div className="creator-tokens">
                        <div className="token-list-header">
                          <h4>All Tokens ({creator.tokens.length})</h4>
                        </div>
                        <div className="token-list">
                          {creator.tokens.map(token => (
                            <div 
                              key={token.id} 
                              className={`token-item ${token.is_active ? 'active' : 'inactive'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`https://odin.fun/token/${token.id}`, '_blank');
                              }}
                            >
                              <div className="token-header-small">
                                <div className="token-info">
                                  <div className="token-image-small">
                                    <img 
                                      src={getTokenImageUrl(token.id)} 
                                      alt={token.name} 
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.onerror = null;
                                        target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>';
                                      }}
                                    />
                                  </div>
                                  <div className="token-name">{token.name}</div>
                                </div>
                                <div className="token-price-container">
                                  <div className="token-price-large">{formatPrice(token.price)}</div>
                                </div>
                              </div>
                              
                              <div className="token-stats">
                                <div className="token-stat">
                                  <div className="stat-label">Volume</div>
                                  <div className="stat-value">{formatTokenVolumeDisplay(token.volume)}</div>
                                </div>
                                <div className="token-stat">
                                  <div className="stat-label">Holders</div>
                                  <div className="stat-value">{formatNumber(token.holder_count)}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="token-creator-info">
                    <div className="no-creator-data">
                      <p>No developer data available</p>
                    </div>
                  </div>
                )}
                
                <div className="token-actions">
                  <button 
                    className="view-token-button"
                    onClick={() => window.open(`https://odin.fun/token/${token.id}`, '_blank')}
                  >
                    View Token
                  </button>
                  {creator && (
                    <button 
                      className="view-creator-button"
                      onClick={() => window.open(`https://odin.fun/user/${creator.principal}`, '_blank')}
                    >
                      View Developer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 