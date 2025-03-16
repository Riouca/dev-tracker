import { useState, useEffect } from 'react';
import { TraderPerformance, findTopTraders } from '../services/api';
import TraderCard from './TraderCard';

function TraderList() {
  const [traders, setTraders] = useState<TraderPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followedTraders, setFollowedTraders] = useState<string[]>([]);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const loadTraders = async () => {
      try {
        setLoading(true);
        const topTraders = await findTopTraders();
        setTraders(topTraders);
        setError(null);
      } catch (err) {
        setError('Failed to load traders. Please try again later.');
        console.error('Error loading traders:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTraders();
  }, [retryCount]);

  useEffect(() => {
    // Load followed traders from localStorage
    const savedFollowedTraders = localStorage.getItem('followedTraders');
    if (savedFollowedTraders) {
      setFollowedTraders(JSON.parse(savedFollowedTraders));
    }
  }, []);

  const handleFollowTrader = (trader: TraderPerformance) => {
    const isCurrentlyFollowing = followedTraders.includes(trader.principal);
    
    let updatedFollowedTraders;
    if (isCurrentlyFollowing) {
      updatedFollowedTraders = followedTraders.filter(id => id !== trader.principal);
    } else {
      updatedFollowedTraders = [...followedTraders, trader.principal];
    }
    
    setFollowedTraders(updatedFollowedTraders);
    localStorage.setItem('followedTraders', JSON.stringify(updatedFollowedTraders));
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="trader-list">
        <h2>Top Traders</h2>
        <div className="loading">Loading top traders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="trader-list">
        <h2>Top Traders</h2>
        <div className="error">
          <p>{error}</p>
          <button className="retry-button" onClick={handleRetry}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (traders.length === 0) {
    return (
      <div className="trader-list">
        <h2>Top Traders</h2>
        <div className="no-traders">
          <p>No traders found.</p>
          <button className="retry-button" onClick={handleRetry}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="trader-list">
      <h2>Top Traders</h2>
      
      <div className="trader-list-info">
        <p>
          These traders are ranked based on their token creation and performance metrics.
          Follow them to see their trading activity.
        </p>
        <p className="note">
          <strong>Note:</strong> Some data may be simulated due to API limitations.
        </p>
      </div>
      
      <div className="trader-cards">
        {traders.map((trader) => (
          <TraderCard
            key={trader.principal}
            trader={trader}
            onFollow={handleFollowTrader}
            isFollowing={followedTraders.includes(trader.principal)}
          />
        ))}
      </div>
    </div>
  );
}

export default TraderList; 