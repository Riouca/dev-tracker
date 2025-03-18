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
  getRecentlyLaunchedTokens,
  getNewestTokens,
  getOlderRecentTokens,
  getTokenHolderData
} from '../services/api'
import { formatPrice, formatDate, formatNumber, getTimeSince, formatDeveloperHoldings } from '../utils/formatters'

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
  const [displayTime, setDisplayTime] = useState<string>('')
  const [expandedCreators, setExpandedCreators] = useState<Set<string>>(new Set())
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all')

  const fetchRecentTokens = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch newest tokens (refreshed every 20 seconds)
      const newestTokens = await getNewestTokens();
      
      // Fetch older recent tokens (refreshed every 5 minutes)
      const olderTokens = await getOlderRecentTokens();
      
      // Combine both sets of tokens
      const allRecentTokens = [...newestTokens, ...olderTokens];
      
      // Process tokens and fetch creator data with force refresh
      const tokensWithCreators: TokenWithCreator[] = []
      
      // Fetch creator performance for each token with force refresh for accurate metrics
      for (const token of allRecentTokens) {
        try {
          const creatorPerformance = await calculateCreatorPerformance(token.creator, true)
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

  // Format the last updated time with seconds
  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) return `${diffSecs} seconds ago`;
    
    const diffMins = Math.floor(diffSecs / 60);
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
      case 'meh': return 'text-amber-600';        // Dark Orange
      case 'scam': return 'text-red-500';         // Red
      default: return 'text-red-500';             // Red
    }
  };

  // Toggle expanded creator
  const toggleExpandCreator = (principal: string, tokenId: string) => {
    const uniqueId = `${principal}-${tokenId}`;
    setExpandedCreators(prev => {
      const newSet = new Set(prev);
      if (newSet.has(uniqueId)) {
        newSet.delete(uniqueId);
      } else {
        newSet.add(uniqueId);
      }
      return newSet;
    });
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

  // Set different polling intervals for newest vs older tokens
  useEffect(() => {
    // Fetch all tokens immediately
    fetchRecentTokens()
    
    // Poll for all tokens every 5 minutes
    const fullRefreshInterval = setInterval(() => {
      console.log('Refreshing all recent tokens...')
      fetchRecentTokens()
    }, 300000) // 5 minutes
    
    // More frequent polling just for newest tokens
    const newestTokensInterval = setInterval(async () => {
      try {
        console.log('Refreshing newest tokens only...')
        const newestTokens = await getNewestTokens()
        
        // Process newest tokens with fresh confidence scores
        const newestWithCreators = await Promise.all(
          newestTokens.map(async (token) => {
            try {
              // Calculate fresh confidence score and token metrics
              const creatorPerformance = await calculateCreatorPerformance(token.creator, true)
              return {
                token,
                creator: creatorPerformance
              }
            } catch (err) {
              return {
                token,
                creator: null
              }
            }
          })
        )
        
        // Update state by replacing only the newest tokens
        setTokens(prevTokens => {
          // Remove the 4 newest tokens (assuming they're at the start)
          const olderTokens = prevTokens.slice(4)
          // Add the new newest tokens at the start
          return [...newestWithCreators, ...olderTokens]
        })
        
        // Also update filtered tokens
        setFilteredTokens(prevTokens => {
          // Filter newest tokens based on current filter
          const filteredNewest = filterTokensByConfidence(newestWithCreators, confidenceFilter)
          // Get older tokens from current filtered tokens
          const olderFiltered = prevTokens.filter(t => 
            !newestTokens.some(n => n.id === t.token.id)
          )
          return [...filteredNewest, ...olderFiltered]
        })
        
        setLastUpdated(new Date())
      } catch (err) {
        console.error('Error refreshing newest tokens:', err)
      }
    }, 20000) // 20 seconds
    
    // Clean up intervals on unmount
    return () => {
      clearInterval(fullRefreshInterval)
      clearInterval(newestTokensInterval)
    }
  }, [confidenceFilter])

  // Helper function to filter tokens by confidence level
  const filterTokensByConfidence = (tokens: TokenWithCreator[], confidenceFilter: string): TokenWithCreator[] => {
    if (confidenceFilter === 'all') {
      return tokens;
    }
    
    return tokens.filter(({ creator }) => {
      if (!creator) return false;
      
      const score = creator.confidenceScore;
      
      switch (confidenceFilter) {
        case 'legendary':
          return score >= 90;
        case 'high':
          return score >= 70 && score < 90;
        case 'medium':
          return score >= 50 && score < 70;
        case 'low':
          return score < 50;
        default:
          return true;
      }
    });
  }

  // Add new effect for refreshing holder counts for displayed tokens
  useEffect(() => {
    if (tokens.length === 0) return;
    
    // Refresh holder counts every minute
    const holderCountInterval = setInterval(async () => {
      try {
        console.log('Refreshing token holder counts...');
        
        // Create a copy of the current tokens
        const updatedTokens = [...tokens];
        let hasChanges = false;
        
        // Update holder counts for the displayed tokens
        for (let i = 0; i < updatedTokens.length; i++) {
          const tokenItem = updatedTokens[i];
          const tokenId = tokenItem.token.id;
          
          try {
            // Get fresh holder data
            const holderData = await getTokenHolderData(tokenId);
            
            // Check if holder count has changed
            if (holderData.holder_count !== tokenItem.token.holder_count) {
              hasChanges = true;
              
              // Update the token with new holder data
              updatedTokens[i] = {
                ...tokenItem,
                token: {
                  ...tokenItem.token,
                  holder_count: holderData.holder_count,
                  holder_top: holderData.holder_top,
                  holder_dev: holderData.holder_dev
                }
              };
            }
          } catch (error) {
            console.error(`Error updating holder count for token ${tokenId}:`, error);
          }
        }
        
        // Only update state if holder counts have changed
        if (hasChanges) {
          setTokens(updatedTokens);
          setFilteredTokens(filterTokensByConfidence(updatedTokens, confidenceFilter));
          setLastUpdated(new Date());
        }
      } catch (err) {
        console.error('Error refreshing holder counts:', err);
      }
    }, 60000); // Every minute
    
    return () => clearInterval(holderCountInterval);
  }, [tokens, confidenceFilter]);

  // Add effect to update the "Last updated" display every second
  useEffect(() => {
    if (!lastUpdated) return;
    
    // Initial format
    setDisplayTime(formatLastUpdated(lastUpdated));
    
    // Update the time display every second
    const timeDisplayInterval = setInterval(() => {
      if (lastUpdated) {
        setDisplayTime(formatLastUpdated(lastUpdated));
      }
    }, 1000);
    
    return () => clearInterval(timeDisplayInterval);
  }, [lastUpdated]);

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
              {lastUpdated ? `Last updated: ${displayTime}` : ''}
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
              className="currency-toggle-button"
              onClick={() => setShowUSD(!showUSD)}
            >
              Show in {showUSD ? 'BTC' : 'USD'}
            </button>
          </div>
        </div>
        
        {loading && filteredTokens.length === 0 ? (
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
                className={`creator-card ${expandedCreators.has(`${creator?.principal}-${token.id}`) ? 'expanded' : ''}`}
              >
                <div 
                  className="creator-header" 
                  onClick={() => window.open(`https://odin.fun/token/${token.id}`, '_blank')}
                >
                  <div className="creator-info">
                    <div className="creator-avatar">
                      <img 
                        src={getTokenImageUrl(token.id)} 
                        alt={token.name} 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>';
                        }}
                      />
                    </div>
                    <div className="creator-details">
                      <div className="creator-title">
                        <h3 className={`creator-name ${creator ? getRarityColor(creator.confidenceScore) : ''}`}>{token.name}</h3>
                        <span className="token-ticker">${token.ticker || token.name.substring(0, 4).toUpperCase()}</span>
                      </div>
                      <div className="creator-metrics">
                        <div className="token-price">
                          <span className="metric-label">Price:</span> 
                          <span>{formatPrice(token.price)}</span>
                        </div>
                        <div className="token-created">
                          <span className="metric-label">Created:</span> 
                          <span>{getTimeSince(token.created_time)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="creator-stats">
                  <div className="creator-stat">
                    <div className="stat-value">{formatNumber(token.holder_count)}</div>
                    <div className="stat-label">Holders</div>
                  </div>
                  <div className="creator-stat">
                    <div className="stat-value volume-value" onClick={() => setShowUSD(!showUSD)}>
                      {formatTokenVolumeDisplay(token.volume)}
                    </div>
                    <div className="stat-label">Volume {showUSD ? '(USD)' : '(BTC)'}</div>
                  </div>
                  <div className="creator-stat">
                    <div className="stat-value">{formatTokenMarketcapDisplay(token.marketcap)}</div>
                    <div className="stat-label">Marketcap</div>
                  </div>
                  <div className="creator-stat">
                    <div className="stat-value">{formatDeveloperHoldings(token.holder_dev, token.total_supply)}</div>
                    <div className="stat-label">Dev Holdings</div>
                  </div>
                </div>
                
                {creator ? (
                  <div 
                    className={`creator-tokens ${expandedCreators.has(`${creator.principal}-${token.id}`) ? 'expanded' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpandCreator(creator.principal, token.id);
                    }}
                    title="Click to see developer's other tokens"
                  >
                    <div className="token-list-header">
                      <h4>Developer Info</h4>
                    </div>
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
                        <div className="creator-title">
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
                          <div className="creator-tokens-count">
                            <span className="metric-label">Tokens:</span> 
                            <span>{creator.activeTokens}/{creator.totalTokens}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {expandedCreators.has(`${creator.principal}-${token.id}`) && (
                      <div className="token-list">
                        {creator.tokens.slice(0, 6).map(tok => {
                          // Use the is_active property directly
                          const shouldShowInactiveTag = !tok.is_active;
                          
                          return (
                            <div 
                              key={tok.id} 
                              className={`token-item ${tok.is_active ? 'active' : 'inactive'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`https://odin.fun/token/${tok.id}`, '_blank');
                              }}
                            >
                              <div className="token-header-small">
                                <div className="token-info">
                                  <div className="token-image-small">
                                    <img 
                                      src={getTokenImageUrl(tok.id)} 
                                      alt={tok.name} 
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.onerror = null;
                                        target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>';
                                      }}
                                    />
                                  </div>
                                  <div className="token-name">
                                    <span className="token-name-text">{tok.name}</span>
                                    {shouldShowInactiveTag && <span className="inactive-tag">Inactive</span>}
                                  </div>
                                </div>
                                <div className="token-price-container">
                                  <div className="token-price-small">{formatPrice(tok.price)}</div>
                                </div>
                              </div>
                              
                              <div className="token-stats">
                                <div className="token-stat">
                                  <div className="stat-label">Volume</div>
                                  <div className="stat-value">{formatTokenVolumeDisplay(tok.volume)}</div>
                                </div>
                                <div className="token-stat">
                                  <div className="stat-label">Holders</div>
                                  <div className="stat-value">{formatNumber(tok.holder_count)}</div>
                                </div>
                                <div className="token-stat">
                                  <div className="stat-label">MCap</div>
                                  <div className="stat-value">{formatTokenMarketcapDisplay(tok.marketcap)}</div>
                                </div>
                                <div className="token-stat">
                                  <div className="stat-label">Txs</div>
                                  <div className="stat-value">{formatNumber(tok.buy_count + tok.sell_count)}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="creator-tokens">
                    <div className="token-list-header">
                      <h4>Developer Info</h4>
                    </div>
                    <div className="no-creator-data">
                      <p>No developer data available</p>
                    </div>
                  </div>
                )}
                
                <div className="creator-actions">
                  <button 
                    className="view-token-button follow-button"
                    onClick={() => window.open(`https://odin.fun/token/${token.id}`, '_blank')}
                  >
                    View Token
                  </button>
                  {creator && (
                    <button 
                      className="view-creator-button follow-button"
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