import { useState, useEffect, ChangeEvent, useContext, useRef } from 'react'
import { CreatorPerformance, CreatorSortOption, processTokensIntoCreators, processTokens } from '../services/api'
import CreatorCard from './CreatorCard'
import { PreloadContext } from '../App'
import { useTopCreators } from '../hooks/useTokenQueries'

// Composant de squelette pour la carte creator
const CreatorCardSkeleton = () => (
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

export function Dashboard() {
  // Context for preloaded data
  const { dashboardData: preloadedData, updateDashboardData, lastDashboardUpdate } = useContext(PreloadContext)
  
  const [displayedCreators, setDisplayedCreators] = useState<CreatorPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Default sorting is based on confidence score, which combines success rate,
  // volume, and active tokens count for an overall developer assessment
  const [sortBy, setSortBy] = useState<CreatorSortOption>('confidence')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  // Set a fixed timestamp 3 minutes in the past instead of null
  const [lastUpdated, setLastUpdated] = useState<Date | null>(() => {
    const date = new Date();
    date.setMinutes(date.getMinutes() - 3);
    return date;
  })
  const [displayTime, setDisplayTime] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [creatorsPerPage, setCreatorsPerPage] = useState(20) // Initialement 20
  const [paginatedCreators, setPaginatedCreators] = useState<CreatorPerformance[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [silentlyUpdating, setSilentlyUpdating] = useState(false)
  
  const sortRefState = useRef({
    sortBy: "",
    sortDirection: "",
    dataHash: ""
  });

  // React Query hook for top creators
  const { 
    data, 
    isLoading: queryLoading, 
    isError: queryError,
    dataUpdatedAt
  } = useTopCreators(100, sortBy, false, {
    // Only fetch if no preloaded data
    enabled: !preloadedData || preloadedData.length === 0,
    retry: 3, // Augmenter le nombre de tentatives
    refetchOnWindowFocus: false, // Éviter les rechargements inutiles
  });

  // Cast data to proper type
  const creators = data as CreatorPerformance[] || [];

  // Update context when data changes
  useEffect(() => {
    if (creators && creators.length > 0) {
      // Filter out creators with no username
      const validData = creators.filter(creator => creator.username && 
        creator.principal && 
        creator.confidenceScore !== undefined);
        
      // Vérifier que les données sont valides et complètes
      if (validData.length < creators.length * 0.8) {
        console.warn(`Received ${creators.length} creators but only ${validData.length} are valid`);
        // Ne pas mettre à jour si trop de données sont invalides
        if (preloadedData && preloadedData.length > validData.length) {
          console.warn("Keeping preloaded data as they are more complete");
          return;
        }
      }
      
      // Update context for other components
      updateDashboardData(validData);
      // Update last updated time
      setLastUpdated(new Date(dataUpdatedAt || Date.now()));
      setSilentlyUpdating(false);
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creators, dataUpdatedAt]);

  // Handle query errors
  useEffect(() => {
    if (queryError) {
      // On error, don't show error state if we have preloaded data
      if (!preloadedData || preloadedData.length === 0) {
        setError('Failed to load creators. Please try again later.');
      }
      setSilentlyUpdating(false);
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryError, preloadedData]);

  // Use preloaded data if available
  useEffect(() => {
    if (preloadedData && preloadedData.length > 0) {
      console.log('Using preloaded dashboard data')
      
      // Vérifie si les scores de confiance sont correctement calculés
      const needsRecalculation = preloadedData.some(creator => 
        creator.confidenceScore === undefined || 
        creator.tokens.some(token => token.is_active === undefined)
      );
      
      if (needsRecalculation) {
        console.log('Recalculating confidence scores for preloaded data');
        // Collecte tous les tokens des créateurs
        const allTokens = preloadedData.flatMap(creator => creator.tokens || []);
        
        // Traite les tokens pour mettre à jour les statuts d'activité et prix en sats
        const processedTokens = processTokens(allTokens);
        
        // Recalcule les scores de confiance
        processTokensIntoCreators(processedTokens)
          .then(recalculatedCreators => {
            // Map les données recalculées aux créateurs existants pour préserver l'ordre
            const updatedCreators = preloadedData.map(creator => {
              const recalculated = recalculatedCreators.find(c => c.principal === creator.principal);
              return recalculated || creator;
            });
            
            setDisplayedCreators(sortCreators(updatedCreators, sortDirection, sortBy));
            updateDashboardData(updatedCreators); // Met à jour le context avec les données recalculées
          })
          .catch(err => {
            console.error('Error recalculating confidence scores:', err);
            setDisplayedCreators(sortCreators(preloadedData, sortDirection, sortBy));
          });
      } else {
        setDisplayedCreators(sortCreators(preloadedData, sortDirection, sortBy));
      }
      
      setLoading(false);
      setLastUpdated(lastDashboardUpdate || new Date());
      
      // If data is older than 2 hours, trigger a silent refresh (increased from 5 minutes)
      const now = new Date();
      const isFresh = lastDashboardUpdate && (now.getTime() - lastDashboardUpdate.getTime() < 2 * 60 * 60 * 1000);
      
      if (!isFresh && !silentlyUpdating) {
        console.log('Data is older than 2 hours, refreshing in background');
        silentlyLoadData();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps - silentlyLoadData intentionally omitted to avoid infinite loops
  }, [preloadedData, lastDashboardUpdate, sortDirection, sortBy, silentlyUpdating]);

  // Update creators when React Query data changes
  useEffect(() => {
    if (creators && creators.length > 0) {
      // Only update if we have new data that's different
      if (!preloadedData || 
          preloadedData.length === 0 || 
          preloadedData[0]?.principal !== creators[0]?.principal) {
        setDisplayedCreators(sortCreators(creators, sortDirection, sortBy))
        if (dataUpdatedAt) {
          setLastUpdated(new Date(dataUpdatedAt))
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creators, dataUpdatedAt, sortDirection, sortBy, preloadedData])

  // Method to silently load data without showing loading state
  const silentlyLoadData = () => {
    if (silentlyUpdating) return // Avoid parallel loads
    setSilentlyUpdating(true)
    // This will trigger the React Query hook to refetch
    // The onSuccess callback will update the state
  }

  // Sort creators when sortBy, sortDirection, or creators change
  useEffect(() => {
    if (!((preloadedData && preloadedData.length > 0) || (creators && creators.length > 0))) {
      return;
    }
    

    const dataToSort = creators.length > 0 ? creators : preloadedData;
    const dataHash = dataToSort.map(c => c.principal).join('-');
    
    if (sortRefState.current.sortBy === sortBy && 
        sortRefState.current.sortDirection === sortDirection && 
        sortRefState.current.dataHash === dataHash) {
      return;
    }
    
    // Use a setTimeout to debounce sorting operations
    const sortTimer = setTimeout(() => {
      console.log('Sorting creators with', sortBy, sortDirection);
      setDisplayedCreators(sortCreators(dataToSort, sortDirection, sortBy));
      
      // Mettre à jour la référence
      sortRefState.current = {
        sortBy,
        sortDirection,
        dataHash
      };
    }, 100);
    
    return () => clearTimeout(sortTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortDirection, creators, preloadedData]);

  // Update displayed creators when search query changes
  useEffect(() => {
    const searchTimer = setTimeout(() => {
      if (searchQuery.trim() === '') {
        // Si la recherche est vide, réinitialiser avec tous les développeurs triés correctement
        const dataToSort = creators.length > 0 ? creators : preloadedData;
        setDisplayedCreators(sortCreators(dataToSort, sortDirection, sortBy));
      } else {
        filterCreators();
      }
    }, 150);
    
    return () => clearTimeout(searchTimer);
  }, [searchQuery, creators, preloadedData, sortDirection, sortBy]);

  // Update paginated creators when displayedCreators or currentPage changes
  useEffect(() => {
    updatePaginatedCreators()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedCreators, currentPage, creatorsPerPage])

  // Add effect to refresh the "Last updated" display every minute
  useEffect(() => {
    if (!lastUpdated) return
    
    // Initial format
    setDisplayTime(formatLastUpdated(lastUpdated))
    
    // Update the time display every second
    const timeDisplayInterval = setInterval(() => {
      if (lastUpdated) {
        setDisplayTime(formatLastUpdated(lastUpdated))
      }
    }, 1000)
    
    return () => clearInterval(timeDisplayInterval)
  }, [lastUpdated])

  // Format the last updated time
  const formatLastUpdated = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    
    if (diffSecs < 60) return 'Just now'
    
    const diffMins = Math.floor(diffSecs / 60)
    if (diffMins === 1) return '1 minute ago'
    if (diffMins < 60) return `${diffMins} minutes ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours === 1) return '1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays} days ago`
  }

  const sortCreators = (creatorsToSort: CreatorPerformance[], direction: 'asc' | 'desc' = 'desc', sortOption: CreatorSortOption) => {
    if (!creatorsToSort || creatorsToSort.length === 0) {
      console.warn("Attempted to sort empty creator list");
      return [];
    }
    
    let sortedCreators = [...creatorsToSort];
    
    try {
      sortedCreators.sort((a, b) => {
        let result = 0;
        
        // Vérification de sécurité pour les données manquantes
        if (!a || !b) return 0;
        
        // Sort by the selected option
        switch (sortOption) {
          case 'tokens':
            result = (b.totalTokens || 0) - (a.totalTokens || 0);
            break;
          case 'active':
            result = (b.activeTokens || 0) - (a.activeTokens || 0);
            break;
          case 'volume':
            result = (b.totalVolume || 0) - (a.totalVolume || 0);
            break;
          case 'success':
            result = (b.successRate || 0) - (a.successRate || 0);
            break;
          case 'weighted':
            result = (b.weightedScore || 0) - (a.weightedScore || 0);
            break;
          case 'confidence':
            result = (b.confidenceScore || 0) - (a.confidenceScore || 0);
            // If confidence scores are equal, sort by marketcap as secondary criterion
            if (result === 0) {
              result = (b.totalMarketcap || 0) - (a.totalMarketcap || 0);
            }
            break;
          case 'holders':
            const aHolders = a.totalHolders || 0;
            const bHolders = b.totalHolders || 0;
            result = bHolders - aHolders;
            break;
          default:
            result = (b.confidenceScore || 0) - (a.confidenceScore || 0);
            // If confidence scores are equal, sort by marketcap as secondary criterion
            if (result === 0) {
              result = (b.totalMarketcap || 0) - (a.totalMarketcap || 0);
            }
        }
        
        // Reverse the result if ascending order is requested
        return direction === 'asc' ? -result : result;
      });
      
      console.log(`Sorted ${sortedCreators.length} creators by ${sortOption} in ${direction} order`);
      
      // Update ranks after sorting
      sortedCreators = sortedCreators.map((creator, index) => ({
        ...creator,
        rank: index + 1
      }));
      
      return sortedCreators;
    } catch (error) {
      console.error("Error sorting creators:", error);
      return creatorsToSort; // En cas d'erreur, retourner la liste non triée
    }
  }

  const filterCreators = () => {
    // Get current data source
    const dataToFilter = creators.length > 0 ? creators : preloadedData;
    
    // Apply search filter if search query exists
    let filtered = dataToFilter;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = dataToFilter.filter(creator => 
        // Search by developer name
        creator.username.toLowerCase().includes(query) ||
        // Search by principal ID
        creator.principal.toLowerCase().includes(query) ||
        // Search by token names
        (creator.tokens && creator.tokens.some(token => 
          token.name.toLowerCase().includes(query)
        ))
      );
    }
    
    // Toujours définir displayedCreators, même si filtered est vide
    // Cela garantit que lorsque searchQuery est effacé, nous reviendrons à tous les développeurs
    setDisplayedCreators(filtered);
    console.log(`Filtered to ${filtered.length} creators`);
    
    // Reset to first page when filtering changes
    setCurrentPage(1);
  }

  const updatePaginatedCreators = () => {
    if (!displayedCreators || displayedCreators.length === 0) {
      setPaginatedCreators([]);
      setTotalPages(0);
      return;
    }
    
    try {
      const indexOfLastCreator = currentPage * creatorsPerPage;
      const indexOfFirstCreator = indexOfLastCreator - creatorsPerPage;
      const currentCreators = displayedCreators.slice(indexOfFirstCreator, indexOfLastCreator);
      
      setPaginatedCreators(currentCreators);
      setTotalPages(Math.ceil(displayedCreators.length / creatorsPerPage));
    } catch (error) {
      console.error("Error updating paginated creators:", error);
      // En cas d'erreur, définir une liste vide
      setPaginatedCreators([]);
      setTotalPages(0);
    }
  }

  const handleSortChange = (newSortBy: CreatorSortOption) => {
    if (newSortBy === sortBy) {
      // Toggle sort direction if clicking the same sort option
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')
    } else {
      // Default to descending order for new sort option
      setSortBy(newSortBy)
      setSortDirection('desc')
    }
    
    // Reset to first page when sort changes
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleCreatorsPerPageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value, 10)
    setCreatorsPerPage(value)
    setCurrentPage(1) // Reset to first page when changing items per page
  }

  // Get sort direction arrow
  const getSortArrow = (option: CreatorSortOption) => {
    if (option !== sortBy) return null
    
    return (
      <span className="sort-arrow">
        {sortDirection === 'desc' ? '↓' : '↑'}
      </span>
    )
  }

  // Generate pagination controls
  const renderPagination = () => {
    if (totalPages <= 1) return null
    
    const pageNumbers: number[] = []
    
    // Always show first page
    pageNumbers.push(1)
    
    // Show current page and pages around it
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (!pageNumbers.includes(i)) {
        pageNumbers.push(i)
      }
    }
    
    // Always show last page
    if (totalPages > 1) {
      pageNumbers.push(totalPages)
    }
    
    // Sort page numbers
    pageNumbers.sort((a, b) => a - b)
    
    return (
      <div className="pagination-container">
        <div className="pagination">
          <button 
            className="pagination-button prev" 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            &laquo; Prev
          </button>
          
          {pageNumbers.map((page, index) => {
            // Add ellipsis if there's a gap
            if (index > 0 && page > pageNumbers[index - 1] + 1) {
              return (
                <span key={`ellipsis-${index}`}>
                  <span className="pagination-ellipsis">...</span>
                  <button 
                    key={page} 
                    className={`pagination-button ${currentPage === page ? 'active' : ''}`}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </button>
                </span>
              )
            }
            
            return (
              <button 
                key={page} 
                className={`pagination-button ${currentPage === page ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            )
          })}
          
          <button 
            className="pagination-button next" 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next &raquo;
          </button>
          
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
        </div>
        
        <div className="pagination-options">
          <label htmlFor="creatorsPerPage">Creators per page:</label>
          <select 
            id="creatorsPerPage" 
            value={creatorsPerPage} 
            onChange={handleCreatorsPerPageChange}
            className="creators-per-page-select"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>
    )
  }

  // Set loading state based on React Query and local state
  const showLoading = loading || (queryLoading && (!preloadedData || preloadedData.length === 0))
  // Set error state 
  const showError = error || (queryError && (!preloadedData || preloadedData.length === 0))

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Top 100 Developers</h1>
        <p className="dashboard-description">
          Track the most successful token creators on Odin.fun with our confidence score system
        </p>
      </div>
      
      <div className="dashboard-actions">
        <div className="dashboard-actions-left">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search by developer or token name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>
      
      <div className="sort-options-container">
        <div className="sort-options">
          <span className="sort-label">Sort by:</span>
          <div className="sort-buttons">
            <button 
              className={`sort-button ${sortBy === 'confidence' ? 'active' : ''}`}
              onClick={() => handleSortChange('confidence')}
            >
              Confidence {getSortArrow('confidence')}
            </button>
            <button 
              className={`sort-button ${sortBy === 'volume' ? 'active' : ''}`}
              onClick={() => handleSortChange('volume')}
            >
              Volume {getSortArrow('volume')}
            </button>
            <button 
              className={`sort-button ${sortBy === 'active' ? 'active' : ''}`}
              onClick={() => handleSortChange('active')}
            >
              Active Tokens {getSortArrow('active')}
            </button>
            <button 
              className={`sort-button ${sortBy === 'success' ? 'active' : ''}`}
              onClick={() => handleSortChange('success')}
            >
              Success Rate {getSortArrow('success')}
            </button>
            <button 
              className={`sort-button ${sortBy === 'tokens' ? 'active' : ''}`}
              onClick={() => handleSortChange('tokens')}
            >
              Total Tokens {getSortArrow('tokens')}
            </button>
            <button 
              className={`sort-button ${sortBy === 'holders' ? 'active' : ''}`}
              onClick={() => handleSortChange('holders')}
            >
              Holders {getSortArrow('holders')}
            </button>
          </div>
        </div>
      </div>
      
      {showLoading ? (
        <div className="creator-list">
          {[...Array(6)].map((_, i) => (
            <CreatorCardSkeleton key={i} />
          ))}
        </div>
      ) : showError ? (
        <div className="error">
          <p>{error || 'Failed to load creators. Please try again later.'}</p>
          <p>Maybe you are rate limited, wait a bit</p>
        </div>
      ) : (!displayedCreators.length && !paginatedCreators.length && !loading) ? (
        <div className="empty-state">
          <p>No developers or tokens found matching "{searchQuery}"</p>
          <p>Try adjusting your search or clear it to see all developers.</p>
        </div>
      ) : (
        <>
          <div className="creator-list">
            {paginatedCreators.length > 0 ? (
              paginatedCreators.map((creator) => (
                <CreatorCard 
                  key={creator.principal} 
                  creator={creator}
                />
              ))
            ) : (
              // Afficher un fallback de skeletons si paginatedCreators est vide mais pas en état d'erreur
              [...Array(6)].map((_, i) => (
                <CreatorCardSkeleton key={`fallback-${i}`} />
              ))
            )}
          </div>
          
          {renderPagination()}
        </>
      )}
      
      <div className="last-updated-footer">
        <span className="last-updated">
          {lastUpdated ? `Last updated: ${displayTime}` : ''}
        </span>
      </div>
    </div>
  )
} 