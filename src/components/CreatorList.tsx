import { useState, useEffect } from 'react';
import { findTopCreators, CreatorPerformance } from '../services/api';
import CreatorCard from './CreatorCard';

function CreatorList() {
  const [creators, setCreators] = useState<CreatorPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCreators() {
      try {
        setLoading(true);
        // Get top 35 creators sorted by active tokens
        const topCreators = await findTopCreators(35, 'active');
        setCreators(topCreators);
        setError(null);
      } catch (err) {
        setError('Failed to load creators');
        console.error('Error loading creators:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCreators();
  }, []);

  if (loading) {
    return (
      <div className="loading">
        Loading top creators...
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        {error}
      </div>
    );
  }

  return (
    <div className="creator-list">
      {creators.map((creator) => (
        <CreatorCard
          key={creator.principal}
          creator={creator}
        />
      ))}
    </div>
  );
}

export default CreatorList; 