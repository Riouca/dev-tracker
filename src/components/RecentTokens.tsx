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
  const [showConfidenceDetails, setShowConfidenceDetails] = useState<string | null>(null)
  const [favoriteTokens, setFavoriteTokens] = useState<Set<string>>(new Set())

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

  // Load favorite tokens from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteTokens');
    if (savedFavorites) {
      setFavoriteTokens(new Set(JSON.parse(savedFavorites)));
    }
  }, []);

  // Filter tokens based on confidence only (remove favorites filter)
  useEffect(() => {
    let filtered = [...tokens];
    
    // Apply confidence filter
    if (confidenceFilter !== 'all' && filtered.length > 0) {
      filtered = filtered.filter(({ creator }) => {
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
    
    setFilteredTokens(filtered);
  }, [tokens, confidenceFilter]);

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

  // Get confidence score color class based on score
  const getRarityColor = (score: number): string => {
    if (score >= 100) return 'legendary';   // Gold - only perfect 100%
    if (score >= 90) return 'epic';         // Purple
    if (score >= 80) return 'great';        // Blue
    if (score >= 70) return 'okay';         // Green
    if (score >= 60) return 'neutral';      // White
    if (score >= 45) return 'meh';          // Dark Orange (amber-600)
    if (score >= 30) return 'scam';         // Brown
    return 'scam';                          // Red
  };
  
  // Get tier name based on confidence score
  const getTierName = (score: number): string => {
    if (score >= 100) return 'Legendary';
    if (score >= 90) return 'Epic';
    if (score >= 80) return 'Great';
    if (score >= 70) return 'Okay';
    if (score >= 60) return 'Neutral';
    if (score >= 45) return 'Meh';
    return 'Scam';
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

  // Toggle confidence details popup
  const toggleConfidenceDetails = (e: React.MouseEvent, principal: string) => {
    e.stopPropagation();
    setShowConfidenceDetails(prev => prev === principal ? null : principal);
  };

  // Calculate individual confidence score components
  const getConfidenceScoreDetails = (creator: CreatorPerformance) => {
    // Get component scores based on the weights
    const successWeight = 0.35;  // 35% weight for success rate
    const volumeWeight = 0.25;   // 25% weight for volume
    const holdersWeight = 0.25;  // 25% weight for holders
    const tradesWeight = 0.05;   // 5% weight for trades
    const mcapWeight = 0.10;     // 10% weight for generated marketcap

    // Get raw scores from the final score (estimating)
    // We don't have access to the raw scores directly, so we'll use the final score to derive them
    const totalScore = creator.confidenceScore;
    
    // Calculate raw scores from the creator data as much as possible
    
    // Success score - estimate based on active vs total tokens with penalty
    let successScore = 0;
    if (creator.totalTokens > 0) {
      // Base success rate
      const successRate = (creator.activeTokens / creator.totalTokens) * 100;
      
      // Pénalité pour tokens inactifs
      const inactiveTokens = creator.totalTokens - creator.activeTokens;
      const penaltyMultiplier = Math.pow(inactiveTokens / creator.totalTokens, 0.5);
      
      successScore = Math.max(0, successRate - (penaltyMultiplier * 20));
      
      // Cas spécial: 0 tokens actifs
      if (creator.activeTokens === 0) {
        successScore = Math.max(0, 100 - (creator.totalTokens * 5));
      }
    }
    
    // Volume score (estimated using linear scale)
    const defaultBtcPrice = 82000; // Default BTC price in USD
    const volumeInUSD = (creator.btcVolume || 0) * defaultBtcPrice;
    const maxVolumeUSD = 600000; // $600K for max score
    const volumeScore = Math.min(100, (volumeInUSD / maxVolumeUSD) * 100);
    
    // Holders score (estimated using linear scale)
    const totalHolders = creator.totalHolders || 0;
    const maxHolders = 600; // 600 holders for max score
    const holdersScore = Math.min(100, (totalHolders / maxHolders) * 100);
    
    // Trades score (estimated using linear scale)
    const totalTrades = creator.totalTrades || 0;
    const maxTrades = 6000; // 6000 transactions for max score
    const tradesScore = Math.min(100, (totalTrades / maxTrades) * 100);
    
    // Marketcap score (estimated using linear scale)
    let mcapScore = 0;
    if (creator.generatedMarketcapUSD !== undefined) {
      const maxMarketcapUSD = 100000; // $100K for max score
      mcapScore = Math.min(100, (creator.generatedMarketcapUSD / maxMarketcapUSD) * 100);
    } else {
      // Fallback calculation remains the same
      const knownComponents = 
        (successScore * successWeight) +
        (volumeScore * volumeWeight) +
        (holdersScore * holdersWeight) +
        (tradesScore * tradesWeight);
      
      const mcapComponent = totalScore - knownComponents;
      mcapScore = mcapComponent / mcapWeight * 100;
    }
    
    // Calculate actual components
    const successComponent = successScore * successWeight;
    const volumeComponent = volumeScore * volumeWeight;
    const holdersComponent = holdersScore * holdersWeight;
    const tradesComponent = tradesScore * tradesWeight;
    const mcapComponent = mcapScore * mcapWeight;
    
    return {
      successComponent: successComponent.toFixed(1),
      volumeComponent: volumeComponent.toFixed(1),
      holdersComponent: holdersComponent.toFixed(1),
      tradesComponent: tradesComponent.toFixed(1),
      mcapComponent: mcapComponent.toFixed(1),
      totalScore: totalScore.toFixed(1),
      // Raw scores before weighting
      successScore: successScore.toFixed(1),
      volumeScore: volumeScore.toFixed(1),
      holdersScore: holdersScore.toFixed(1),
      tradesScore: tradesScore.toFixed(1),
      mcapScore: mcapScore.toFixed(1),
      // Additional contextual info
      volumeInUSD: volumeInUSD.toFixed(0),
      generatedMarketcapUSD: Math.round(creator.generatedMarketcapUSD || 0).toString()
    };
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
                <div className="creator-header" 
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
                        <h3 className={`creator-name ${creator ? getRarityColor(creator.confidenceScore) : ''}`}>
                          {token.name}
                          <span className="external-link-wrapper">
                            <svg className="external-link-icon" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                              <polyline points="15 3 21 3 21 9"></polyline>
                              <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                          </span>
                        </h3>
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
                      {/* Social links icons */}
                      <div className="token-social-icons">
                        {token.twitter && (
                          <a 
                            href={`https://twitter.com/${token.twitter}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="token-social-icon twitter"
                            title={`@${token.twitter}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231L17.79 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                          </a>
                        )}
                        {token.website && (
                          <a 
                            href={token.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="token-social-icon website"
                            title="Website"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="2" y1="12" x2="22" y2="12"></line>
                              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                            </svg>
                          </a>
                        )}
                        {token.telegram && (
                          <a 
                            href={`https://t.me/${token.telegram}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="token-social-icon telegram"
                            title="Telegram"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path fill-rule="evenodd" clip-rule="evenodd" d="M24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12ZM12.43 8.85893C11.2629 9.3444 8.93014 10.3492 5.43188 11.8733C4.85235 12.0992 4.55322 12.3202 4.53451 12.5363C4.50219 12.9015 4.96728 13.0453 5.57856 13.2423C5.6783 13.2736 5.78218 13.3058 5.88934 13.3408C6.48936 13.5411 7.27897 13.7749 7.68124 13.7861C8.04969 13.7964 8.46004 13.6466 8.91229 13.3367C12.2111 11.1125 13.9234 9.99271 14.0491 9.97718C14.1401 9.96621 14.2643 9.95172 14.3501 10.0312C14.4358 10.1108 14.4277 10.2542 14.4189 10.2926C14.3716 10.5178 12.5282 12.1981 11.5717 13.0879C11.2758 13.3698 11.0606 13.5733 11.0169 13.6191C10.9217 13.7186 10.8243 13.8138 10.7303 13.9056C10.1535 14.4698 9.71735 14.8981 10.7571 15.5767C11.2877 15.9165 11.7101 16.1999 12.131 16.4825C12.595 16.7921 13.0571 17.1007 13.6443 17.4853C13.7943 17.5814 13.9382 17.6819 14.0784 17.7799C14.5882 18.1398 15.0431 18.4606 15.5964 18.4122C15.9205 18.3826 16.2554 18.081 16.4257 17.1719C16.8936 14.7446 17.8152 9.56185 18.0277 7.4455C18.0414 7.27425 18.0304 7.10235 18.0039 6.93403C17.9846 6.8127 17.9225 6.70177 17.8302 6.62195C17.6904 6.509 17.4942 6.48658 17.4075 6.48871C17.0134 6.4978 16.418 6.70653 12.43 8.85893Z" />
                            </svg>
                          </a>
                        )}
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
                            <span className={getRarityColor(creator.confidenceScore)}>
                              {creator.confidenceScore.toFixed(1)}%
                            </span>
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
                                    <div className="token-name-wrapper">
                                      <span className="token-item-name">
                                        {tok.name}
                                      </span>
                                      <span className="external-link-wrapper">
                                        <svg className="external-link-icon small" xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                          <polyline points="15 3 21 3 21 9"></polyline>
                                          <line x1="10" y1="14" x2="21" y2="3"></line>
                                        </svg>
                                      </span>
                                    </div>
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