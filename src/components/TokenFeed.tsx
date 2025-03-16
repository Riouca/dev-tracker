import { useState, useEffect } from 'react';
import { Token, getFollowedCreatorsTokens } from '../services/api';

interface TokenFeedProps {
  followedCreators: string[];
}

function TokenFeed({ followedCreators }: TokenFeedProps) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokens = async () => {
      if (followedCreators.length === 0) {
        setTokens([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const creatorTokens = await getFollowedCreatorsTokens(followedCreators);
        setTokens(creatorTokens);
        setError(null);
      } catch (err) {
        setError('Failed to load tokens. Please try again later.');
        console.error('Error loading tokens:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, [followedCreators]);

  // Format large numbers with K, M, B suffixes
  const formatNumber = (num: number): string => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Format date to relative time (e.g., "2 days ago")
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <div className="token-feed">
        <h2>Latest Tokens</h2>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading tokens...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="token-feed">
        <h2>Latest Tokens</h2>
        <div className="error-container">
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  if (followedCreators.length === 0) {
    return (
      <div className="token-feed">
        <h2>Latest Tokens</h2>
        <div className="no-followed-creators">
          <p>Follow creators to see their latest tokens here.</p>
        </div>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="token-feed">
        <h2>Latest Tokens</h2>
        <div className="no-tokens">
          <p>No tokens found from followed creators.</p>
          <p>This could be due to API limitations. Try following more creators or check back later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="token-feed">
      <h2>Latest Tokens</h2>
      <div className="token-feed-grid">
        {tokens.map((token) => (
          <div key={token.id} className="token-feed-card">
            <div className="token-feed-card-header">
              <div className="token-image">
                {token.image ? (
                  <img src={`https://api.odin.fun/v1/image/${token.image}`} alt={token.name} />
                ) : (
                  <div className="token-image-placeholder">{token.name.charAt(0)}</div>
                )}
              </div>
              <div className="token-info">
                <h3 className="token-name">{token.name}</h3>
                <span className="token-id">{token.id}</span>
                <span className="token-created">{formatRelativeTime(token.created_time)}</span>
              </div>
            </div>
            
            <div className="token-feed-stats">
              <div className="token-feed-stat">
                <span className="token-feed-stat-value">{(token.price / 100000000).toFixed(8)}</span>
                <span className="token-feed-stat-label">Price (BTC)</span>
              </div>
              <div className="token-feed-stat">
                <span className="token-feed-stat-value">{formatNumber(token.volume)}</span>
                <span className="token-feed-stat-label">Volume</span>
              </div>
              <div className="token-feed-stat">
                <span className="token-feed-stat-value">{formatNumber(token.holder_count)}</span>
                <span className="token-feed-stat-label">Holders</span>
              </div>
              <div className="token-feed-stat">
                <span className={`token-feed-stat-value ${token.price - token.price_1d >= 0 ? 'positive' : 'negative'}`}>
                  {token.price - token.price_1d >= 0 ? '+' : ''}
                  {((token.price - token.price_1d) / token.price_1d * 100).toFixed(2)}%
                </span>
                <span className="token-feed-stat-label">24h Change</span>
              </div>
            </div>
            
            <div className="token-feed-description">
              <p>{token.description}</p>
            </div>
            
            <div className="token-feed-actions">
              <a 
                href={`https://odin.fun/token/${token.id}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="view-token-button"
              >
                View Token
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TokenFeed; 