import React, { useState, useEffect } from 'react';
import { findTopCreators } from '../services/creatorService';
import { CreatorPerformance, CreatorSortOption, FilterOption } from '../types/creatorTypes';

function Dashboard() {
  const [creators, setCreators] = useState<CreatorPerformance[]>([]);
  const [filteredCreators, setFilteredCreators] = useState<CreatorPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<CreatorSortOption>('confidence');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [followedCreators, setFollowedCreators] = useState<string[]>([]);
  
  // Add a state for tracking last update time
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Load creator data on initial load and refresh every 20 minutes
  useEffect(() => {
    fetchCreators();
    
    // Set up interval to refresh data every 20 minutes
    const refreshInterval = setInterval(() => {
      fetchCreators(true);
    }, 20 * 60 * 1000); // 20 minutes in milliseconds
    
    // Clean up interval on component unmount
    return () => clearInterval(refreshInterval);
  }, []);
  
  // Function to fetch creators, default to using cache
  const fetchCreators = async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await findTopCreators(200, sortOption, forceRefresh);
      setCreators(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching creators:', err);
      setError('Failed to load creator data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters whenever creators, filter option, or search query changes
  useEffect(() => {
    filterCreators();
  }, [creators, filterOption, searchQuery, followedCreators]);
  
  // Monitor localStorage for followed creators changes
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('followedCreators');
      if (stored) {
        setFollowedCreators(JSON.parse(stored));
      }
    };
    
    // Load initial followed state
    handleStorageChange();
    
    // Listen for changes
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
}

export default Dashboard; 