import { useState, useEffect } from 'react';
import { CreatorPerformance, Token, convertPriceToSats, formatVolume, formatMarketcap, convertVolumeToBTC, getRarityLevel, getBTCPrice, convertBTCToUSD } from '../services/api';
import { formatNumber, formatPrice, getTimeSince } from '../utils/formatters';

interface CreatorCardProps {
  creator: CreatorPerformance;
  onUpdate?: () => void;
}

function getRarityColor(score: number): string {
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
}

function getRankMedal(rank: number | undefined): string {
  if (!rank) return '';
  if (rank === 1) return '🥇 ';
  if (rank === 2) return '🥈 ';
  if (rank === 3) return '🥉 ';
  return '';
}

function CreatorCard({ creator, onUpdate }: CreatorCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);
  const [showUSD, setShowUSD] = useState(true); // Default to USD display
  const [usdPrice, setUsdPrice] = useState<number | null>(null);

  useEffect(() => {
    // Fetch BTC price in USD
    const fetchBTCPrice = async () => {
      try {
        const price = await getBTCPrice();
        setUsdPrice(price);
      } catch (error) {
        console.error('Error fetching BTC price:', error);
      }
    };

    fetchBTCPrice();
  }, []);

  // Check if creator is followed on component mount
  useEffect(() => {
    const followedCreators = JSON.parse(localStorage.getItem('followedCreators') || '[]');
    setIsFollowed(followedCreators.includes(creator.principal));
  }, [creator.principal]);

  const toggleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    const followedCreators = JSON.parse(localStorage.getItem('followedCreators') || '[]');
    
    if (isFollowed) {
      // Remove from followed
      const updatedFollowed = followedCreators.filter((p: string) => p !== creator.principal);
      localStorage.setItem('followedCreators', JSON.stringify(updatedFollowed));
    } else {
      // Add to followed
      followedCreators.push(creator.principal);
      localStorage.setItem('followedCreators', JSON.stringify(followedCreators));
    }
    
    setIsFollowed(!isFollowed);
    // Trigger storage event for other components to update
    window.dispatchEvent(new Event('storage'));
    
    // Call onUpdate if provided
    if (onUpdate) {
      onUpdate();
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
  
  // Calculate average price of tokens
  const avgPrice = creator.tokens.length > 0 
    ? creator.tokens.reduce((sum, token) => sum + (token.price_in_sats || convertPriceToSats(token.price)), 0) / creator.tokens.length
    : 0;

  // Get token image URL
  const getTokenImageUrl = (tokenId: string) => {
    return `https://images.odin.fun/token/${tokenId}`;
  };

  // Format volume display
  const formatVolumeDisplay = () => {
    if (showUSD) {
      // Show in USD
      if (usdPrice && creator.btcVolume) {
        const usdVolume = creator.btcVolume * usdPrice;
        
        if (usdVolume >= 1000000) {
          return `$${(usdVolume / 1000000).toFixed(1)}M`;
        } else if (usdVolume >= 1000) {
          return `$${(usdVolume / 1000).toFixed(1)}K`;
        } else {
          return `$${usdVolume.toFixed(0)}`;
        }
      } else {
        return formatVolume(creator.totalVolume, true);
      }
    } else {
      // Show in BTC
      if (creator.btcVolume) {
        if (creator.btcVolume >= 1000) {
          return `${(creator.btcVolume / 1000).toFixed(1)}K BTC`;
        } else if (creator.btcVolume >= 1) {
          return `${creator.btcVolume.toFixed(1)} BTC`;
        } else if (creator.btcVolume >= 0.001) {
          return `${creator.btcVolume.toFixed(3)} BTC`;
        } else {
          return `${(creator.totalVolume / 1000000 / 1000).toFixed(2)}M sats`;
        }
      } else {
        return formatVolume(creator.totalVolume, false);
      }
    }
  };

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

  return (
    <div className={`creator-card ${isExpanded ? 'expanded' : ''}`}>
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
                <span className={rarityColor}>{creator.confidenceScore.toFixed(1)}%</span>
              </div>
              <div className="creator-last-token">
                <span className="metric-label">Last token:</span> 
                <span className="token-date">{lastTokenDate}</span>
              </div>
              <div className="creator-trades">
                <span className="metric-label">Total trades:</span> 
                <span className="trade-count">{formatNumber(totalTrades)}</span>
              </div>
              <div className="creator-avg-price">
                <span className="metric-label">Avg token price:</span> 
                <span className="avg-price">{avgPrice.toFixed(3)} sats</span>
              </div>
            </div>
          </div>
          <div className="creator-actions">
            <button 
              className={`follow-button ${isFollowed ? 'following' : ''}`}
              onClick={toggleFollow}
              aria-label={isFollowed ? 'Unfollow creator' : 'Follow creator'}
            >
              {isFollowed ? 'Following' : 'Follow'}
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
                      <div className="token-name">{token.name}</div>
                    </div>
                    <div className="token-price-container">
                      <div className="token-price-large">{formatPrice(token.price)}</div>
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
                      ⚠️ DEAD TOKEN ⚠️ - {token.inactive_reason}
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