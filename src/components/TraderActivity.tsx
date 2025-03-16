import { useState, useEffect } from 'react';
import { Trade, User, getUser, getUserTrades, getToken } from '../services/api';

interface TraderActivityProps {
  followedTraders: string[];
}

interface TradeWithUser extends Trade {
  userDetails: User;
  tokenName?: string;
}

function TraderActivity({ followedTraders }: TraderActivityProps) {
  const [recentTrades, setRecentTrades] = useState<TradeWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTraderActivity = async () => {
      if (followedTraders.length === 0) {
        setRecentTrades([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch trades for each followed trader
        const tradePromises = followedTraders.map(async (principal) => {
          try {
            const userDetails = await getUser(principal);
            const trades = await getUserTrades(principal, 10);
            
            // If we have trades, add user details to each trade
            if (trades.length > 0) {
              // Add token names to trades
              const tradesWithTokenNames = await Promise.all(
                trades.map(async (trade) => {
                  try {
                    const tokenDetails = await getToken(trade.token);
                    return {
                      ...trade,
                      userDetails,
                      tokenName: tokenDetails.name
                    };
                  } catch (err) {
                    return {
                      ...trade,
                      userDetails,
                      tokenName: trade.token
                    };
                  }
                })
              );
              
              return tradesWithTokenNames;
            }
            
            // If no trades, return an empty array
            return [];
          } catch (err) {
            console.error(`Error fetching trades for ${principal}:`, err);
            return [];
          }
        });
        
        const traderTradesArrays = await Promise.all(tradePromises);
        
        // Flatten the array of arrays and sort by time (most recent first)
        const allTrades = traderTradesArrays
          .flat()
          .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        
        setRecentTrades(allTrades);
        setError(null);
      } catch (err) {
        setError('Failed to load trader activity. Please try again later.');
        console.error('Error loading trader activity:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTraderActivity();
  }, [followedTraders]);

  if (loading) {
    return <div className="loading">Loading trader activity...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (followedTraders.length === 0) {
    return <div className="no-followed-traders">Follow traders to see their activity here.</div>;
  }

  if (recentTrades.length === 0) {
    return (
      <div className="trader-activity">
        <h2>Recent Activity</h2>
        <div className="no-activity">
          <p>No recent activity from followed traders.</p>
          <p>This could be due to API limitations. Try following more traders or check back later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trader-activity">
      <h2>Recent Activity</h2>
      <div className="activity-list">
        {recentTrades.map((trade) => (
          <div key={trade.id} className="activity-item">
            <div className="activity-header">
              <div className="trader-info">
                {trade.userDetails.image ? (
                  <img 
                    src={`https://api.odin.fun/v1/image/${trade.userDetails.image}`} 
                    alt={trade.userDetails.username} 
                    className="trader-avatar"
                  />
                ) : (
                  <div className="avatar-placeholder">
                    {trade.userDetails.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="trader-name">{trade.userDetails.username}</span>
              </div>
              <span className="activity-time">
                {new Date(trade.time).toLocaleString()}
              </span>
            </div>
            
            <div className="activity-details">
              <div className={`trade-type ${trade.buy ? 'buy' : 'sell'}`}>
                {trade.buy ? 'Bought' : 'Sold'}
              </div>
              <div className="token-info">
                <a 
                  href={`https://odin.fun/token/${trade.token}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="token-link"
                >
                  {trade.tokenName || trade.token}
                </a>
              </div>
              <div className="trade-amount">
                {(trade.amount_token / Math.pow(10, trade.divisibility)).toFixed(trade.decimals)} tokens
              </div>
              <div className="trade-price">
                at {(trade.price / 100000000).toFixed(8)} BTC
              </div>
            </div>
            
            <div className="activity-actions">
              <button 
                className="copy-trade-button"
                onClick={() => window.open(`https://odin.fun/token/${trade.token}`, '_blank')}
              >
                View Token
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TraderActivity; 