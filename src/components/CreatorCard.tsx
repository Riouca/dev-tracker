import { useState, useEffect } from 'react';
import { CreatorPerformance, Token, convertPriceToSats, formatVolume, convertVolumeToBTC, getRarityLevel, getBTCPrice, convertBTCToUSD } from '../services/api';
import { formatNumber, formatPrice, getTimeSince } from '../utils/formatters';

interface CreatorCardProps {
  creator: CreatorPerformance;
}

function getRarityColor(score: number): string {
  const level = getRarityLevel(score);
  switch (level) {
    case 'legendary': return 'text-yellow-400'; // Gold
    case 'epic': return 'text-purple-400';      // Purple
    case 'rare': return 'text-blue-400';        // Blue
    case 'uncommon': return 'text-green-400';   // Green
    case 'common': return 'text-gray-100';      // White
    case 'basic': return 'text-gray-400';       // Gray
    case 'novice': return 'text-amber-700';     // Brown
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

function CreatorCard({ creator }: CreatorCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);
  const [showBTC, setShowBTC] = useState(false);
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
  };

  // Check if creator is followed on component mount
  useState(() => {
    const followedCreators = JSON.parse(localStorage.getItem('followedCreators') || '[]');
    setIsFollowed(followedCreators.includes(creator.principal));
  });

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleVolumeDisplay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowBTC(!showBTC);
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
    if (showBTC) {
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
        return 'Loading...';
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
          return `${(creator.totalVolume / 1000000).toFixed(2)}M sats`;
        }
      } else {
        return formatVolume(creator.totalVolume);
      }
    }
  };

  // Format metrics for display
  const formatMetrics = () => {
    const metrics = [
      {
        label: 'Success Rate',
        value: `${creator.successRate.toFixed(0)}%`,
        tooltip: 'Percentage of tokens that are active'
      },
      {
        label: 'Confidence',
        value: `${creator.confidenceScore.toFixed(1)}%`,
        tooltip: 'Overall score based on multiple factors',
        className: rarityColor
      },
      {
        label: 'Tokens',
        value: `${creator.activeTokens}/${creator.totalTokens}`,
        tooltip: 'Active tokens vs total tokens created'
      },
      {
        label: 'Avg Age',
        value: creator.avgTokenAge ? `${Math.round(creator.avgTokenAge)} days` : 'N/A',
        tooltip: 'Average age of tokens'
      }
    ];

    return metrics;
  };

  // Format additional metrics for expanded view
  const formatAdditionalMetrics = () => {
    const metrics = [
      {
        label: 'Highest Price',
        value: creator.highestTokenPrice ? `${creator.highestTokenPrice.toFixed(3)} sats` : 'N/A',
        tooltip: 'Highest price achieved by any token'
      },
      {
        label: 'Buy/Sell Ratio',
        value: creator.buySellRatio ? creator.buySellRatio.toFixed(2) : 'N/A',
        tooltip: 'Ratio of buys to sells (1.0 is balanced)'
      },
      {
        label: 'Total Holders',
        value: formatNumber(creator.totalHolders || 0),
        tooltip: 'Total number of token holders'
      },
      {
        label: 'Total Trades',
        value: formatNumber(creator.totalTrades || 0),
        tooltip: 'Total number of trades across all tokens'
      }
    ];

    return metrics;
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
                <span className="trade-count">{formatNumber(creator.totalTrades || 0)}</span>
              </div>
              <div className="creator-avg-price">
                <span className="metric-label">Avg token price:</span> 
                <span className="avg-price">{avgPrice.toFixed(3)} sats</span>
              </div>
            </div>
          </div>
          <button 
            className={`star-button ${isFollowed ? 'following' : ''}`}
            onClick={toggleFollow}
            aria-label={isFollowed ? 'Unfollow creator' : 'Follow creator'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          </button>
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
            <div className="stat-label">Volume</div>
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
        
        {isExpanded && (
          <div className="creator-additional-metrics">
            <h4>Additional Metrics</h4>
            <div className="metrics-grid">
              {formatAdditionalMetrics().map((metric, index) => (
                <div key={index} className="metric-item" title={metric.tooltip}>
                  <div className="metric-value">{metric.value}</div>
                  <div className="metric-label">{metric.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {isExpanded && (
        <div className="creator-tokens">
          <div className="token-list-header">
            <h4>Top Tokens</h4>
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
                    <div className="token-price">{formatPrice(token.price)}</div>
                  </div>
                  {!token.is_active && (
                    <div className="inactive-reason">{token.inactive_reason}</div>
                  )}
                  <div className="token-stats">
                    <div className="token-stat">
                      <span className="stat-label">Volume:</span>
                      <span className="stat-value">{formatVolume(token.volume)}</span>
                    </div>
                    <div className="token-stat">
                      <span className="stat-label">Holders:</span>
                      <span className="stat-value">{formatNumber(token.holder_count)}</span>
                    </div>
                    <div className="token-stat">
                      <span className="stat-label">Trades:</span>
                      <span className="stat-value">{formatNumber(token.buy_count + token.sell_count)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="view-all-link">
            <a 
              href={`https://odin.fun/user/${creator.principal}`} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              View on Odin.fun
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreatorCard; 