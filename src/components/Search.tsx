import { useState, useEffect } from 'react'
import { 
  getToken,
  CreatorPerformance, 
  Token as ApiToken, 
  getBTCPrice,
  calculateCreatorPerformance,
  formatVolume,
  formatMarketcap
} from '../services/api'
import CreatorCard from './CreatorCard'
import './Search.css'

function Search() {
  const [searchQuery, setSearchQuery] = useState('')
  const [creator, setCreator] = useState<CreatorPerformance | null>(null)
  const [token, setToken] = useState<ApiToken | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [btcPrice, setBtcPrice] = useState<number | null>(null)

  // Fetch BTC price on component mount
  useEffect(() => {
    const fetchBtcPrice = async () => {
      // getBTCPrice now returns a fixed value without errors
      const price = await getBTCPrice()
      setBtcPrice(price)
    }
    
    fetchBtcPrice()
  }, [])
  
  // Parse search input to extract token/dev ID
  const parseSearchQuery = (query: string): string => {
    // Remove any whitespace
    query = query.trim()
    
    // Parse URL format: https://odin.fun/token/2jjj → 2jjj
    if (query.includes('odin.fun/token/')) {
      return query.split('odin.fun/token/')[1].split('?')[0].split('#')[0].trim()
    }
    
    // Parse URL format: https://odin.fun/user/vv5jb-... → vv5jb-...
    if (query.includes('odin.fun/user/')) {
      return query.split('odin.fun/user/')[1].split('?')[0].split('#')[0].trim()
    }
    
    // Return as is for direct IDs
    return query
  }
  
  // Determine if input is likely a token or developer ID
  const identifySearchType = (query: string): 'dev' | 'token' => {
    // Developer principal IDs are generally longer and contain hyphens
    if (query.includes('-') || query.length > 20) {
      return 'dev'
    }
    
    // Default to token search for shorter IDs
    return 'token'
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!searchQuery.trim()) {
      setError('Please enter a token ID or developer ID')
      return
    }
    
    setLoading(true)
    setError(null)
    setCreator(null)
    setToken(null)
    
    // Parse and clean the search query
    const parsedQuery = parseSearchQuery(searchQuery)
    const detectedType = identifySearchType(parsedQuery)
    
    try {
      if (detectedType === 'token') {
        // Search for token
        const tokenData = await getToken(parsedQuery)
        setToken(tokenData)
        
        // Get creator info if available
        if (tokenData.creator && typeof tokenData.creator === 'string') {
          try {
            
            // Calculate creator performance metrics
            const creatorPerformance = await calculateCreatorPerformance(
              tokenData.creator
            )
            
            setCreator(creatorPerformance)
          } catch (err) {
            console.error('Error fetching token creator:', err)
          }
        }
      } else {
        // Search for developer
        try {
          // Calculate creator performance metrics
          const creatorPerformance = await calculateCreatorPerformance(
            parsedQuery
          )
          
          setCreator(creatorPerformance)
        } catch (err) {
          console.error('Error fetching developer:', err)
          setError('Developer not found. Please check the ID and try again.')
        }
      }
    } catch (err) {
      console.error('Search error:', err)
      setError(detectedType === 'token' 
        ? 'Token not found. Please check the ID and try again.' 
        : 'Developer not found. Please check the ID and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  // Format token volume display
  const formatTokenVolumeDisplay = (volume: number) => {
    if (btcPrice) {
      const btcVolume = volume / 100000000 / 1000; // Convert to BTC and divide by 1000
      const usdVolume = btcVolume * btcPrice;
      
      if (usdVolume >= 1000000) {
        return `$${(usdVolume / 1000000).toFixed(1)}M`;
      } else if (usdVolume >= 1000) {
        return `$${(usdVolume / 1000).toFixed(1)}K`;
      } else {
        return `$${usdVolume.toFixed(0)}`;
      }
    } else {
      return formatVolume(volume, true);
    }
  };
  
  // Format token marketcap display
  const formatTokenMarketcapDisplay = (marketcap: number) => {
    if (btcPrice) {
      const btcMarketcap = marketcap / 100000000 / 1000; // Convert to BTC and divide by 1000
      const usdMarketcap = btcMarketcap * btcPrice;
      
      if (usdMarketcap >= 1000000) {
        return `$${(usdMarketcap / 1000000).toFixed(1)}M`;
      } else if (usdMarketcap >= 1000) {
        return `$${(usdMarketcap / 1000).toFixed(1)}K`;
      } else {
        return `$${usdMarketcap.toFixed(0)}`;
      }
    } else {
      return formatMarketcap(marketcap, true);
    }
  };

  return (
    <div className="search-container">
      <div className="search-header">
        <h1 className="search-title">Search Token or Developer</h1>
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder="Enter token ID, developer ID, or full Odin.fun URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <button type="submit" className="search-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          </div>
          <div className="search-examples">
            <p>
              Examples: 
              <span className="search-example" onClick={() => {
                setSearchQuery("2jjj");
                setTimeout(() => {
                  const searchForm = document.querySelector('.search-form') as HTMLFormElement;
                  if (searchForm) searchForm.dispatchEvent(new Event('submit'));
                }, 0);
              }}>2jjj</span> 
              <span className="search-example" onClick={() => {
                setSearchQuery("https://odin.fun/token/2jjj");
                setTimeout(() => {
                  const searchForm = document.querySelector('.search-form') as HTMLFormElement;
                  if (searchForm) searchForm.dispatchEvent(new Event('submit'));
                }, 0);
              }}>https://odin.fun/token/2jjj</span>
              <span className="search-example" onClick={() => {
                setSearchQuery("vv5jb-7sm7u-vn3nq-6nflf-dghis-fd7ji-cx764-xunni-zosog-eqvpw-oae");
                setTimeout(() => {
                  const searchForm = document.querySelector('.search-form') as HTMLFormElement;
                  if (searchForm) searchForm.dispatchEvent(new Event('submit'));
                }, 0);
              }}>vv5jb-7sm7u-vn3nq-6nflf-dghis-fd7ji-cx764-xunni-zosog-eqvpw-oae</span>
            </p>
          </div>
        </form>
      </div>
      
      <div className="search-content">
        {loading && (
          <div className="search-loading">
            <div className="spinner"></div>
            <p>Searching...</p>
          </div>
        )}
        
        {error && !loading && (
          <div className="search-error">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12" y2="16"></line>
            </svg>
            <h2>{error}</h2>
            <p>Try a different ID or check your input format</p>
          </div>
        )}
        
        {!loading && !error && !creator && !token && (
          <div className="search-initial-state">
            <div className="search-illustration">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <h2>Search for a Token or Developer</h2>
            <p>Enter a token ID or developer ID to see detailed information</p>
          </div>
        )}
        
        {/* TOKEN SEARCH RESULT */}
        {!loading && token && (
          <div className="search-result token-result">
            <div className="token-full-result">
              {/* Import the token display structure similar to RecentTokens */}
              <div className={`token-card ${!token.is_active ? 'inactive' : 'active'}`}>
                <div className="token-header">
                  <div className="token-name-section">
                    <div className="token-icon">
                      <img 
                        src={`https://images.odin.fun/token/${token.id}`} 
                        alt={token.name}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>';
                        }}
                      />
                    </div>
                    <div className="token-title">
                      <h3 className="token-name-text">
                        {token.name}
                        <a 
                          href={`https://odin.fun/token/${token.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="external-link-wrapper"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                          </svg>
                        </a>
                      </h3>
                      <div className="token-details">
                        <span className="token-ticker">{token.ticker || ''}</span>
                        <span className="token-date">Created: {new Date(token.created_time).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="token-price-section">
                    <div className="token-price">{(token.price_in_sats || 0).toFixed(3)} sats</div>
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
                    {!token.is_active && (
                      <div className="inactive-reason">
                        ⚠️ INACTIVE TOKEN ⚠️
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="token-stats">
                  <div className="token-stat">
                    <div className="stat-label">Holders</div>
                    <div className="stat-value">{token.holder_count.toLocaleString()}</div>
                  </div>
                  <div className="token-stat">
                    <div className="stat-label">Transactions</div>
                    <div className="stat-value">{(token.buy_count + token.sell_count).toLocaleString()}</div>
                  </div>
                  <div className="token-stat">
                    <div className="stat-label">Marketcap</div>
                    <div className="stat-value">
                      {formatTokenMarketcapDisplay(token.marketcap)}
                    </div>
                  </div>
                  <div className="token-stat">
                    <div className="stat-label">Volume</div>
                    <div className="stat-value">
                      {formatTokenVolumeDisplay(token.volume)}
                    </div>
                  </div>
                </div>
                
                {token.description && (
                  <div className="token-description">
                    <p>{token.description}</p>
                  </div>
                )}
                
                <div className="token-links">
                  {token.twitter && (
                    <a 
                      href={token.twitter} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="token-link twitter"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231L17.79 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      <span>Twitter</span>
                    </a>
                  )}
                  
                  {token.website && (
                    <a 
                      href={token.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="token-link website"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                      </svg>
                      <span>Website</span>
                    </a>
                  )}
                  
                  {token.telegram && (
                    <a 
                      href={token.telegram} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="token-link telegram"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12ZM12.43 8.85893C11.2629 9.3444 8.93014 10.3492 5.43188 11.8733C4.85235 12.0992 4.55322 12.3202 4.53451 12.5363C4.50219 12.9015 4.96728 13.0453 5.57856 13.2423C5.6783 13.2736 5.78218 13.3058 5.88934 13.3408C6.48936 13.5411 7.27897 13.7749 7.68124 13.7861C8.04969 13.7964 8.46004 13.6466 8.91229 13.3367C12.2111 11.1125 13.9234 9.99271 14.0491 9.97718C14.1401 9.96621 14.2643 9.95172 14.3501 10.0312C14.4358 10.1108 14.4277 10.2542 14.4189 10.2926C14.3716 10.5178 12.5282 12.1981 11.5717 13.0879C11.2758 13.3698 11.0606 13.5733 11.0169 13.6191C10.9217 13.7186 10.8243 13.8138 10.7303 13.9056C10.1535 14.4698 9.71735 14.8981 10.7571 15.5767C11.2877 15.9165 11.7101 16.1999 12.131 16.4825C12.595 16.7921 13.0571 17.1007 13.6443 17.4853C13.7943 17.5814 13.9382 17.6819 14.0784 17.7799C14.5882 18.1398 15.0431 18.4606 15.5964 18.4122C15.9205 18.3826 16.2554 18.081 16.4257 17.1719C16.8936 14.7446 17.8152 9.56185 18.0277 7.4455C18.0414 7.27425 18.0304 7.10235 18.0039 6.93403C17.9846 6.8127 17.9225 6.70177 17.8302 6.62195C17.6904 6.509 17.4942 6.48658 17.4075 6.48871C17.0134 6.4978 16.418 6.70653 12.43 8.85893Z" />
                      </svg>
                      <span>Telegram</span>
                    </a>
                  )}
                </div>
              </div>
              
              {/* Developer section */}
              {creator && (
                <div className="search-section">
                  <h2 className="search-section-title">Developer</h2>
                  <div className="dashboard">
                    <CreatorCard 
                      creator={creator}
                      btcPrice={btcPrice || undefined}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* DEVELOPER SEARCH RESULT */}
        {!loading && !token && creator && (
          <div className="search-result developer-result">
            <div className="dashboard">
              <CreatorCard 
                key={creator.principal} 
                creator={creator}
                btcPrice={btcPrice || undefined}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Search 