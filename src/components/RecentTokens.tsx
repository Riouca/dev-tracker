import { useState, useEffect } from 'react'
import { 
  getUserImageUrl, 
  getTokenImageUrl, 
  getBTCPrice,
  getRarityLevel,
  formatTokenVolumeDisplay,
  formatTokenMarketcapDisplay
} from '../services/api'
import { formatNumber, getTimeSince, formatDeveloperHoldings } from '../utils/formatters'
import { useRecentTokensRedux } from '../hooks/useRecentTokensRedux'

// Composant de squelette pour les tokens récents
const TokenCardSkeleton = () => (
  <div className="creator-card skeleton-card">
    <div className="skeleton-header">
      <div className="skeleton-avatar"></div>
      <div className="skeleton-content">
        <div className="skeleton-line long"></div>
        <div className="skeleton-line medium"></div>
      </div>
    </div>
    <div className="skeleton-stats">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton-stat">
          <div className="skeleton-line short"></div>
          <div className="skeleton-line medium"></div>
        </div>
      ))}
    </div>
  </div>
);

export function RecentTokens() {
  // Utiliser notre hook Redux personnalisé
  const {
    filteredTokens,
    loading,
    error,
    newTokenIds,
    confidenceFilter,
    handleConfidenceFilterChange,
  } = useRecentTokensRedux();
  
  // État local pour le mode d'affichage USD/BTC
  const [showUSD, setShowUSD] = useState(true);
  // État local pour le prix BTC
  const [usdPrice, setUsdPrice] = useState<number | null>(null);
  // État pour les créateurs développés
  const [expandedCreators, setExpandedCreators] = useState<Set<string>>(new Set());
  // État pour les créateurs suivis
  const [followedCreators, setFollowedCreators] = useState<string[]>([]);

  // Load followed creators from localStorage
  useEffect(() => {
    const updateFollowedCreators = () => {
      try {
        const creators = JSON.parse(localStorage.getItem('followedCreators') || '[]')
        setFollowedCreators(Array.isArray(creators) ? creators : [])
      } catch (error) {
        console.error('Error parsing followed creators:', error)
        setFollowedCreators([])
      }
    }
    
    updateFollowedCreators()
    
    // Listen for changes
    window.addEventListener('storage', updateFollowedCreators)
    window.addEventListener('followStatusChanged', updateFollowedCreators)
    
    return () => {
      window.removeEventListener('storage', updateFollowedCreators)
      window.removeEventListener('followStatusChanged', updateFollowedCreators)
    }
  }, []);

  // Check if a creator is followed
  const isCreatorFollowed = (principal: string): boolean => {
    return followedCreators.includes(principal)
  }
  
  // Toggle follow status for a creator
  const toggleFollowCreator = (principal: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      // Get current followed creators
      let updatedFollowedCreators = [...followedCreators]
      
      // Determine if we're following or unfollowing
      const isCurrentlyFollowed = isCreatorFollowed(principal)
      
      if (!isCurrentlyFollowed) {
        // Create star burst effect when following
        createStarBurst(e)
        
        // Add to followed (avoid duplicates)
        if (!updatedFollowedCreators.includes(principal)) {
          updatedFollowedCreators.push(principal)
        }
      } else {
        // Remove from followed
        updatedFollowedCreators = updatedFollowedCreators.filter(p => p !== principal)
      }
      
      // Update localStorage
      localStorage.setItem('followedCreators', JSON.stringify(updatedFollowedCreators))
      
      // Update local state
      setFollowedCreators(updatedFollowedCreators)
      
      // Trigger both events to ensure all components update
      window.dispatchEvent(new Event('storage'))
      
      // Trigger a custom event with detailed information about what happened
      window.dispatchEvent(new CustomEvent('followStatusChanged', { 
        detail: { 
          principal: principal,
          action: isCurrentlyFollowed ? 'unfollow' : 'follow'
        }
      }))
    } catch (error) {
      console.error('Error updating follow status:', error)
    }
  }
  
  // Function to create the star burst effect
  const createStarBurst = (e: React.MouseEvent) => {
    const button = e.currentTarget as HTMLElement
    
    // Create 3-5 stars
    const starCount = Math.floor(Math.random() * 3) + 3
    
    for (let i = 0; i < starCount; i++) {
      // Create a star
      const star = document.createElement('div')
      star.className = 'star-particle'
      document.body.appendChild(star)
      
      // Position the star relative to the button
      const rect = button.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      // Random angle and distance from center
      const angle = Math.random() * Math.PI * 2
      const distance = 10 + Math.random() * 30
      
      // Calculate final position
      const x = centerX + Math.cos(angle) * distance
      const y = centerY + Math.sin(angle) * distance
      
      // Apply position with fixed positioning relative to viewport
      star.style.position = 'fixed'
      star.style.left = `${x}px`
      star.style.top = `${y}px`
      star.style.zIndex = '9999'
      star.style.animationDelay = `${Math.random() * 50}ms`
      
      // Remove star after animation completes
      setTimeout(() => {
        if (document.body.contains(star)) {
          document.body.removeChild(star)
        }
      }, 500)
    }
  }

  // Fetch BTC price for USD conversion
  useEffect(() => {
    const fetchBTCPrice = async () => {
      const price = await getBTCPrice()
      setUsdPrice(price)
    }
    fetchBTCPrice()
  }, []);

  // format token volume and marketcap using the utility functions
  const formatVolumeWithUsd = (volume: number) => {
    return formatTokenVolumeDisplay(volume, showUSD, usdPrice || undefined);
  };

  const formatMarketcapWithUsd = (marketcap: number) => {
    return formatTokenMarketcapDisplay(marketcap, showUSD, usdPrice || undefined);
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
  
  // Toggle expanded creator
  const toggleExpandCreator = (principal: string, tokenId: string) => {
    const uniqueId = `${principal}-${tokenId}`;
    setExpandedCreators(prev => {
      const newSet = new Set(prev);
      if (newSet.has(uniqueId)) {
        newSet.delete(uniqueId);
      } else {
        // Create a new set with only this expanded creator
        return new Set([uniqueId]);
      }
      return newSet;
    });
  };

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
            <span className="live-data-indicator">
              <span className="live-dot"></span> Live Data
            </span>
            <div className="confidence-filter">
              <label htmlFor="confidence-filter">Filter by confidence:</label>
              <select 
                id="confidence-filter" 
                value={confidenceFilter}
                onChange={(e) => handleConfidenceFilterChange(e.target.value)}
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
          <div className="creator-list">
            {[...Array(6)].map((_, i) => (
              <TokenCardSkeleton key={i} />
            ))}
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
                className={`creator-card ${expandedCreators.has(`${creator?.principal}-${token.id}`) ? 'expanded' : ''} ${newTokenIds.includes(token.id) ? 'new-token-highlight' : ''} ${!token.is_active ? 'inactive' : 'active'}`}
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
                          <span>{(token.price_in_sats || 0).toFixed(3)} sats</span>
                        </div>
                        <div className="token-created">
                          <span className="metric-label">Created:</span> 
                          <span>{token.created_time ? getTimeSince(token.created_time) : 'Unknown'}</span>
                        </div>
                      </div>
                      {/* Social links icons - always render the container even if empty */}
                      <div className="token-social-icons">
                        {token.twitter && (
                          <a 
                            href={token.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="token-social-icon twitter"
                            title="Twitter"
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
                            href={token.telegram}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="token-social-icon telegram"
                            title="Telegram"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path fillRule="evenodd" clipRule="evenodd" d="M24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12ZM12.43 8.85893C11.2629 9.3444 8.93014 10.3492 5.43188 11.8733C4.85235 12.0992 4.55322 12.3202 4.53451 12.5363C4.50219 12.9015 4.96728 13.0453 5.57856 13.2423C5.6783 13.2736 5.78218 13.3058 5.88934 13.3408C6.48936 13.5411 7.27897 13.7749 7.68124 13.7861C8.04969 13.7964 8.46004 13.6466 8.91229 13.3367C12.2111 11.1125 13.9234 9.99271 14.0491 9.97718C14.1401 9.96621 14.2643 9.95172 14.3501 10.0312C14.4358 10.1108 14.4277 10.2542 14.4189 10.2926C14.3716 10.5178 12.5282 12.1981 11.5717 13.0879C11.2758 13.3698 11.0606 13.5733 11.0169 13.6191C10.9217 13.7186 10.8243 13.8138 10.7303 13.9056C10.1535 14.4698 9.71735 14.8981 10.7571 15.5767C11.2877 15.9165 11.7101 16.1999 12.131 16.4825C12.595 16.7921 13.0571 17.1007 13.6443 17.4853C13.7943 17.5814 13.9382 17.6819 14.0784 17.7799C14.5882 18.1398 15.0431 18.4606 15.5964 18.4122C15.9205 18.3826 16.2554 18.081 16.4257 17.1719C16.8936 14.7446 17.8152 9.56185 18.0277 7.4455C18.0414 7.27425 18.0304 7.10235 18.0039 6.93403C17.9846 6.8127 17.9225 6.70177 17.8302 6.62195C17.6904 6.509 17.4942 6.48658 17.4075 6.48871C17.0134 6.4978 16.418 6.70653 12.43 8.85893Z" />
                            </svg>
                          </a>
                        )}
                        {/* Placeholder to maintain consistent height when no social links exist */}
                        {!token.twitter && !token.website && !token.telegram && (
                          <div className="token-social-placeholder"></div>
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
                      {formatVolumeWithUsd(token.volume)}
                    </div>
                    <div className="stat-label">Volume {showUSD ? '(USD)' : '(BTC)'}</div>
                  </div>
                  <div className="creator-stat">
                    <div className="stat-value">{formatMarketcapWithUsd(token.marketcap)}</div>
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
                              {creator.confidenceScore.toFixed(2)}%
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
                        {/* Sort tokens by marketcap (highest first) before slicing */}
                        {creator.tokens
                          .slice()
                          .sort((a, b) => b.marketcap - a.marketcap)
                          .slice(0, 6)
                          .map((tok, index) => {
                            // Si le token est le même que celui affiché dans la carte principale, 
                            // utiliser les données du token principal pour garantir la cohérence
                            const currentTokenData = tok.id === token.id ? token : tok;
                            // Use the is_active property directly
                            const shouldShowInactiveTag = !currentTokenData.is_active;
                          
                            return (
                              <div 
                                key={`${creator.principal}-${currentTokenData.id}-${index}`} 
                                className={`token-item ${currentTokenData.is_active ? 'active' : 'inactive'}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`https://odin.fun/token/${currentTokenData.id}`, '_blank');
                                }}
                              >
                                <div className="token-header-small">
                                  <div className="token-info">
                                    <div className="token-image-small">
                                      <img 
                                        src={getTokenImageUrl(currentTokenData.id)} 
                                        alt={currentTokenData.name} 
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
                                          {currentTokenData.name}
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
                                    <div className="token-price-small">{(currentTokenData.price_in_sats || 0).toFixed(3)} sats</div>
                                  </div>
                                </div>
                                
                                <div className="token-stats">
                                  <div className="token-stat">
                                    <div className="stat-label">Volume</div>
                                    <div className="stat-value">{formatVolumeWithUsd(currentTokenData.volume)}</div>
                                  </div>
                                  <div className="token-stat">
                                    <div className="stat-label">Holders</div>
                                    <div className="stat-value">{formatNumber(currentTokenData.holder_count)}</div>
                                  </div>
                                  <div className="token-stat">
                                    <div className="stat-label">MCap</div>
                                    <div className="stat-value">{formatMarketcapWithUsd(currentTokenData.marketcap)}</div>
                                  </div>
                                  <div className="token-stat">
                                    <div className="stat-label">Txs</div>
                                    <div className="stat-value">{formatNumber(currentTokenData.buy_count + currentTokenData.sell_count)}</div>
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
                  {creator && (
                    <>
                      <button 
                        className="view-creator-button follow-button"
                        onClick={() => window.open(`https://odin.fun/user/${creator.principal}`, '_blank')}
                      >
                        View Developer
                      </button>
                      <button 
                        className={`follow-button ${isCreatorFollowed(creator.principal) ? 'following' : ''}`}
                        onClick={(e) => toggleFollowCreator(creator.principal, e)}
                      >
                        {isCreatorFollowed(creator.principal) ? 'Following' : '⭐ Follow'}
                      </button>
                    </>
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