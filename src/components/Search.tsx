import { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  Token, 
  getUser, 
  getUserImageUrl, 
  getTokenImageUrl, 
  formatVolume,
  convertPriceToSats,
  isTokenActive 
} from '../services/api'
import { formatPrice, formatDate } from '../utils/formatters'

export function Search() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Token[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Use the direct API endpoint
      const response = await axios.get(
        `https://api.odin.fun/v1/tokens?search=${encodeURIComponent(query)}&sort=last_action_time%3Adesc&page=1&limit=30`
      );
      const results = response.data.data || [];
      
      // Process tokens and add activity status
      const processedResults = results.map((token: Token) => {
        token.price_in_sats = convertPriceToSats(token.price);
        isTokenActive(token);
        return token;
      });
      
      setSearchResults(processedResults);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search tokens');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(searchQuery)
  }

  return (
    <div className="search-page">
      <div className="dashboard-header">
        <h1>Search Tokens</h1>
        <p className="dashboard-description">
          Search for tokens by name, ticker, or creator
        </p>
      </div>
      
      <div className="search-container">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder="Search tokens..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <button 
              type="submit" 
              className="search-button"
              disabled={loading || !searchQuery.trim()}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      </div>
      
      {loading ? (
        <div className="loading">Searching...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : searchResults.length > 0 ? (
        <div className="search-results">
          <h2 className="results-title">Search Results</h2>
          <div className="tokens-grid">
            {searchResults.map(token => (
              <div 
                key={token.id} 
                className={`token-card ${token.is_active ? 'active-token' : 'inactive-token'}`}
                onClick={() => window.open(`https://odin.fun/token/${token.id}`, '_blank')}
              >
                <div className="token-header">
                  <div className="token-image-wrapper">
                    {token.image ? (
                      <img 
                        src={getTokenImageUrl(token.id)} 
                        alt={token.name} 
                        className="token-image" 
                      />
                    ) : (
                      <div className="token-image-placeholder">
                        {token.name[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="token-title">
                    <h3>{token.name}</h3>
                    <span className="token-ticker">${token.ticker || token.name.substring(0, 4).toUpperCase()}</span>
                  </div>
                </div>
                <div className="token-details">
                  <div className="token-detail">
                    <span className="detail-label">Price</span>
                    <span className="detail-value">{formatPrice(token.price)}</span>
                  </div>
                  <div className="token-detail">
                    <span className="detail-label">Volume</span>
                    <span className="detail-value">{formatVolume(token.volume)}</span>
                  </div>
                  <div className="token-detail">
                    <span className="detail-label">Holders</span>
                    <span className="detail-value">{token.holder_count.toLocaleString()}</span>
                  </div>
                </div>
                {!token.is_active && (
                  <div className="token-inactive-badge">Inactive</div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : searchQuery && !loading ? (
        <div className="empty-state">
          <p>No tokens found matching "{searchQuery}"</p>
          <p>Try a different search term</p>
        </div>
      ) : null}
    </div>
  )
} 