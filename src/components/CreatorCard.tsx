import { useState, useEffect } from 'react';
import { CreatorPerformance, formatVolume, formatMarketcap, getBTCPrice } from '../services/api';
import { formatNumber, getTimeSince } from '../utils/formatters';

interface CreatorCardProps {
  creator: CreatorPerformance;
  onUpdate?: () => void;
  btcPrice?: number;
}

function getRarityColor(score: number): string {
  if (score >= 100) return 'legendary';   // Gold - only perfect 100%
  if (score >= 90) return 'epic';         // Purple
  if (score >= 80) return 'great';        // Blue
  if (score >= 70) return 'okay';         // Green
  if (score >= 60) return 'neutral';      // White
  if (score >= 45) return 'meh';          // Dark Orange (amber-600)
  if (score >= 30) return 'scam';         // Brown
  return 'scam';                          // Red
}

function getRankMedal(rank: number | undefined): string {
  if (!rank) return '';
  if (rank === 1) return '🥇 ';
  if (rank === 2) return '🥈 ';
  if (rank === 3) return '🥉 ';
  return '';
}

function CreatorCard({ creator, onUpdate, btcPrice }: CreatorCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);
  const [showUSD, setShowUSD] = useState(true); // Default to USD display
  const [usdPrice, setUsdPrice] = useState<number | null>(null);

  useEffect(() => {
    // Fetch BTC price in USD
    const fetchBTCPrice = async () => {
      // Use provided btcPrice prop if available, otherwise fetch it
      if (btcPrice) {
        setUsdPrice(btcPrice);
      } else {
        // getBTCPrice now returns a fixed value without errors
        const price = await getBTCPrice();
        setUsdPrice(price);
      }
    };
    
    fetchBTCPrice();
  }, [btcPrice]);

  // Check if creator is followed on component mount
  useEffect(() => {
    const followedCreators = JSON.parse(localStorage.getItem('followedCreators') || '[]');
    setIsFollowed(followedCreators.includes(creator.principal));
  }, [creator.principal]);

  const toggleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Get current followed creators
      const followedCreatorsStr = localStorage.getItem('followedCreators');
      let followedCreators = [];
      
      // Parse safely with fallback to empty array
      try {
        followedCreators = JSON.parse(followedCreatorsStr || '[]');
        if (!Array.isArray(followedCreators)) {
          followedCreators = [];
        }
      } catch (parseError) {
        console.error('Error parsing followedCreators:', parseError);
        followedCreators = [];
      }
      
      // Determine if we're following or unfollowing
      const isFollowAction = !isFollowed;
      
      if (isFollowAction) {
        // Create star burst effect when following
        createStarBurst(e);
        
        // Add to followed (avoid duplicates)
        if (!followedCreators.includes(creator.principal)) {
          followedCreators.push(creator.principal);
        }
        localStorage.setItem('followedCreators', JSON.stringify(followedCreators));
      } else {
        // Remove from followed
        const updatedFollowed = followedCreators.filter((p: string) => p !== creator.principal);
        localStorage.setItem('followedCreators', JSON.stringify(updatedFollowed));
        
        // If we're in the Dashboard on the 'followed' tab, remove this card immediately from display
        const dashboardElement = document.querySelector('.dashboard');
        const followedTabActive = document.querySelector('.dashboard-tab.active')?.textContent?.includes('Followed');
        
        if (dashboardElement && followedTabActive) {
          // Find this card and remove it with animation
          const card = (e.currentTarget as HTMLElement)?.closest('.creator-card');
          if (card) {
            card.classList.add('removing');
            setTimeout(() => {
              (card as HTMLElement).style.display = 'none';
            }, 300); // Match this with CSS animation duration
          }
        }
      }
      
      setIsFollowed(!isFollowed);
      
      // Trigger both events to ensure all components update
      window.dispatchEvent(new Event('storage'));
      
      // Trigger a custom event with detailed information about what happened
      window.dispatchEvent(new CustomEvent('followStatusChanged', { 
        detail: { 
          principal: creator.principal,
          action: isFollowAction ? 'follow' : 'unfollow'
        }
      }));
      
      // Call onUpdate if provided
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
    }
  };
  
  // Function to create the star burst effect
  const createStarBurst = (e: React.MouseEvent) => {
    const button = e.currentTarget as HTMLElement;
    
    // Create 3-5 stars
    const starCount = Math.floor(Math.random() * 3) + 3;
    
    for (let i = 0; i < starCount; i++) {
      // Create a star
      const star = document.createElement('div');
      star.className = 'star-particle';
      document.body.appendChild(star);
      
      // Position the star relative to the button
      const rect = button.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Random angle and distance from center (distance plus grande)
      const angle = Math.random() * Math.PI * 2;
      const distance = 10 + Math.random() * 30;
      
      // Calculate final position
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      
      // Apply position with fixed positioning relative to viewport
      star.style.position = 'fixed';
      star.style.left = `${x}px`;
      star.style.top = `${y}px`;
      star.style.zIndex = '9999';
      star.style.animationDelay = `${Math.random() * 50}ms`;
      
      // Remove star after animation completes
      setTimeout(() => {
        if (document.body.contains(star)) {
          document.body.removeChild(star);
        }
      }, 500); // Un peu plus long que l'animation pour assurer que toutes les étoiles sont terminées
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleVolumeDisplay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowUSD(!showUSD);
  };

  const formattedSuccessRate = `${creator.successRate.toFixed(0)}%`;
  const lastTokenDate = creator.lastTokenCreated 
    ? getTimeSince(creator.lastTokenCreated)
    : 'Unknown';
  
  const rarityColor = getRarityColor(creator.confidenceScore);
  const rankMedal = getRankMedal(creator.rank);
  const rarityLevel = getRarityLevel(creator.confidenceScore);
  
  // Calculate total trades
  const totalTrades = creator.totalTrades || creator.tokens.reduce((sum, token) => sum + token.buy_count + token.sell_count, 0);
  
  // Get token image URL
  const getTokenImageUrl = (tokenId: string) => {
    return `https://images.odin.fun/token/${tokenId}`;
  };

  // Format volume display
  const formatVolumeDisplay = () => {
    if (showUSD) {
      // Show in USD
      if (usdPrice && creator.btcVolume !== undefined) {
        const usdVolume = creator.btcVolume * usdPrice;
        
        if (usdVolume >= 1000000) {
          return `$${(usdVolume / 1000000).toFixed(1)}M`;
        } else if (usdVolume >= 1000) {
          return `$${(usdVolume / 1000).toFixed(1)}K`;
        } else {
          return `$${usdVolume.toFixed(0)}`;
        }
      } else {
        // Fallback using totalVolume
        return formatVolume(creator.totalVolume, true);
      }
    } else {
      // Show in BTC
      if (creator.btcVolume !== undefined) {
        if (creator.btcVolume >= 1000) {
          return `${(creator.btcVolume / 1000).toFixed(1)}K BTC`;
        } else if (creator.btcVolume >= 1) {
          return `${creator.btcVolume.toFixed(2)} BTC`;
        } else if (creator.btcVolume >= 0.001) {
          return `${creator.btcVolume.toFixed(5)} BTC`;
        } else {
          return `${(creator.btcVolume * 100000000).toFixed(0)} sats`;
        }
      } else {
        // Fallback using totalVolume
        return formatVolume(creator.totalVolume, false);
      }
    }
  };

  // Format marketcap display
  const formatMarketcapDisplay = () => {
    if (showUSD) {
      // Show in USD
      if (creator.generatedMarketcapUSD && creator.generatedMarketcapUSD > 0) {
        const usdValue = creator.generatedMarketcapUSD;
        
        if (usdValue >= 1000000) {
          return `$${(usdValue / 1000000).toFixed(1)}M`;
        } else if (usdValue >= 1000) {
          return `$${(usdValue / 1000).toFixed(1)}K`;
        } else {
          return `$${usdValue.toFixed(0)}`;
        }
      } else if (creator.generatedMarketcapBTC !== undefined) {
        // Utilisez directement generatedMarketcapBTC qui est déjà en BTC
        const usdValue = creator.generatedMarketcapBTC * (usdPrice || 88888);
        
        if (usdValue >= 1000000) {
          return `$${(usdValue / 1000000).toFixed(1)}M`;
        } else if (usdValue >= 1000) {
          return `$${(usdValue / 1000).toFixed(1)}K`;
        } else {
          return `$${usdValue.toFixed(0)}`;
        }
      } else {
        return "$0";
      }
    } else {
      // Show in BTC
      if (creator.generatedMarketcapBTC !== undefined) {
        // Utilisez directement generatedMarketcapBTC qui est déjà en BTC
        const btcValue = creator.generatedMarketcapBTC;
        
        if (btcValue >= 1000) {
          return `${(btcValue / 1000).toFixed(1)}K BTC`;
        } else if (btcValue >= 1) {
          return `${btcValue.toFixed(2)} BTC`;
        } else if (btcValue >= 0.001) {
          return `${btcValue.toFixed(5)} BTC`;
        } else {
          return `${(btcValue * 100000000).toFixed(0)} sats`;
        }
      } else {
        return "0 BTC";
      }
    }
  };

  // Format token volume display
  const formatTokenVolumeDisplay = (volume: number) => {
    if (showUSD && usdPrice) {
      // Diviser par 1000 une fois de plus pour obtenir la valeur correcte
      const btcVolume = volume / 100000000 / 1000; // Déjà divisé par 1000 dans convertVolumeToBTC
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
      // Diviser par 1000 une fois de plus pour obtenir la valeur correcte
      const btcMarketcap = marketcap / 100000000 / 1000; // Déjà divisé par 1000 dans convertMarketcapToBTC
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

  // Get rarity level based on confidence score
  function getRarityLevel(score: number): string {
    if (score >= 100) return 'legendary';   // Gold - only perfect 100%
    if (score >= 90) return 'epic';         // Purple
    if (score >= 80) return 'great';        // Blue
    if (score >= 70) return 'okay';         // Green
    if (score >= 60) return 'neutral';      // White
    if (score >= 45) return 'meh';          // Dark Orange
    if (score >= 30) return 'scam';         // Brown
    return 'scam';                          // Red
  }

  return (
    <div 
      className={`creator-card ${isExpanded ? 'expanded' : ''} ${creator.successRate < 50 ? 'inactive' : 'active'}`} 
      onClick={toggleExpand}
    >
      <div className="creator-header-wrapper" title="Click to expand developer details">
        <div className="creator-header" onClick={toggleExpand}>
          <div className="creator-info">
            <div className="creator-avatar">
              {creator.image ? (
                <img 
                  src={`https://images.odin.fun/user/${creator.principal}`} 
                  alt={creator.username} 
                />
              ) : (
                <div className="creator-avatar-placeholder">
                  {creator.username[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="creator-details">
              <div className="creator-title">
                <h3 className={`creator-name ${rarityColor}`}>
                  {rankMedal}{creator.username}
                </h3>
                <span className={`rarity-badge ${rarityColor}`}>
                  {rarityLevel.charAt(0).toUpperCase() + rarityLevel.slice(1)}
                </span>
              </div>
              <div className="creator-metrics">
                <div className="confidence-score">
                  <span className="metric-label">Confidence:</span> 
                  <span className={rarityColor}>
                    {creator.confidenceScore.toFixed(2)}%
                  </span>
                </div>
                <div className="creator-last-token">
                  <span className="metric-label">Last Token:</span> 
                  <span className="last-token-date">{lastTokenDate}</span>
                </div>
                <div className="creator-trades">
                  <span className="metric-label">Total trades:</span> 
                  <span className="trade-count">{formatNumber(totalTrades)}</span>
                </div>
                <div className="creator-avg-price">
                  <span className="metric-label">Generated MCap:</span> 
                  <span className="avg-price">
                    {formatMarketcapDisplay()}
                  </span>
                </div>
              </div>
            </div>
            <div className="creator-actions">
              <button 
                className={`follow-button ${isFollowed ? 'following' : ''}`}
                onClick={toggleFollow}
                aria-label={isFollowed ? 'Unfollow creator' : 'Follow creator'}
              >
                {isFollowed ? 'Following' : '⭐ Follow'}
              </button>
            </div>
          </div>
          
          <div className="creator-stats">
            <div className="creator-stat">
              <div className="stat-value">{creator.activeTokens}/{creator.totalTokens}</div>
              <div className="stat-label">Active Tokens</div>
            </div>
            <div className="creator-stat" onClick={toggleVolumeDisplay}>
              <div className="stat-value volume-value">
                {formatVolumeDisplay()}
              </div>
              <div className="stat-label">Volume {showUSD ? '(USD)' : '(BTC)'}</div>
            </div>
            <div className="creator-stat">
              <div className="stat-value">{formattedSuccessRate}</div>
              <div className="stat-label">Success Rate</div>
            </div>
            <div className="creator-stat">
              <div className="stat-value">{formatNumber(creator.totalHolders || 0)}</div>
              <div className="stat-label">Total Holders</div>
            </div>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="creator-tokens">
          <div className="token-list-header">
            <h4>All Tokens ({creator.tokens.length})</h4>
            <button 
              className="currency-toggle-button"
              onClick={(e) => {
                e.stopPropagation();
                setShowUSD(!showUSD);
              }}
            >
              Show in {showUSD ? 'BTC' : 'USD'}
            </button>
          </div>
          <div className="token-list">
            {creator.tokens.map(token => (
              <div 
                key={token.id} 
                className={`token-item ${token.is_active ? 'active' : 'inactive'}`}
                onClick={() => window.open(`https://odin.fun/token/${token.id}`, '_blank')}
              >
                <div className="token-item-content">
                  <div className="token-header-small">
                    <div className="token-info">
                      <div className="token-image-small">
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
                      <div className="token-name">
                        {token.name}
                        <span className="external-link-wrapper">
                          <svg className="external-link-icon" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                          </svg>
                        </span>
                      </div>
                    </div>
                    <div className="token-price-container">
                      <div className="token-price-large">{(token.price_in_sats || 0).toFixed(3)} sats</div>
                      <div className="token-price-change">
                        {token.price_change_24h !== undefined ? (
                          <span className={token.price_change_24h >= 0 ? 'price-up' : 'price-down'}>
                            24h: {token.price_change_24h >= 0 ? '↑' : '↓'} 
                            {Math.abs(token.price_change_24h).toFixed(2)}%
                          </span>
                        ) : (
                          <span className="price-neutral">24h: 0.00%</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!token.is_active && (
                    <div className="inactive-reason">
                      ⚠️ DEAD TOKEN ⚠️
                    </div>
                  )}
                  <div className="token-stats">
                    <div className="token-stat">
                      <span className="stat-label">Volume:</span>
                      <span className="stat-value">{formatTokenVolumeDisplay(token.volume)}</span>
                    </div>
                    <div className="token-stat">
                      <span className="stat-label">Marketcap:</span>
                      <span className="stat-value">{formatTokenMarketcapDisplay(token.marketcap)}</span>
                    </div>
                    <div className="token-stat">
                      <span className="stat-label">Holders:</span>
                      <span className="stat-value">{formatNumber(token.holder_count)}</span>
                    </div>
                    <div className="token-stat">
                      <span className="stat-label">Transactions:</span>
                      <span className="stat-value">{formatNumber(token.buy_count + token.sell_count)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="view-all-link">
            <a 
              href={`https://odin.fun/user/${creator.principal}?tab=created-tokens`} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              See dev on Odin.fun
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreatorCard; 