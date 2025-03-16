import { useState } from 'react';
import { TraderPerformance } from '../services/api';

interface TraderCardProps {
  trader: TraderPerformance;
  onFollow: (trader: TraderPerformance) => void;
  isFollowing: boolean;
}

function TraderCard({ trader, onFollow, isFollowing }: TraderCardProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <div className={`trader-card ${expanded ? 'expanded' : ''}`}>
      <div className="trader-card-header" onClick={toggleExpand}>
        <div className="trader-avatar">
          {trader.image ? (
            <img src={`https://api.odin.fun/v1/image/${trader.image}`} alt={trader.username} />
          ) : (
            <div className="avatar-placeholder">{trader.username.charAt(0).toUpperCase()}</div>
          )}
        </div>
        <div className="trader-info">
          <h3>{trader.username}</h3>
          <div className="trader-stats">
            <span className="profit-percentage">
              {trader.profitPercentage.toFixed(2)}% success
            </span>
            <span className="trade-count">
              {trader.totalTrades} trades
            </span>
          </div>
        </div>
        <button 
          className={`follow-button ${isFollowing ? 'following' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onFollow(trader);
          }}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      </div>
      
      {expanded && (
        <div className="trader-details">
          <div className="performance-stats">
            <div className="stat-item">
              <span className="stat-label">Success Rate</span>
              <span className="stat-value">{trader.profitPercentage.toFixed(2)}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Trades</span>
              <span className="stat-value">{trader.totalTrades}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Successful Trades</span>
              <span className="stat-value">{trader.successfulTrades}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Profit</span>
              <span className="stat-value">{trader.totalProfit.toFixed(4)}</span>
            </div>
          </div>
          
          <div className="recent-tokens">
            <h4>Recent Tokens</h4>
            <div className="token-list">
              {trader.recentTokens.map((tokenId) => (
                <div key={tokenId} className="token-item">
                  <a href={`https://odin.fun/token/${tokenId}`} target="_blank" rel="noopener noreferrer">
                    {tokenId}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TraderCard; 