import { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  getUser, 
  getUserImageUrl, 
  getTokenImageUrl, 
  formatVolume, 
  convertPriceToSats, 
  isTokenActive,
  Token as ApiToken
} from '../services/api'
import { formatPrice, formatDate, formatNumber } from '../utils/formatters'

const API_BASE_URL = 'https://api.odin.fun/v1'

export function RecentTokens() {
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecentTokens = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Use the direct API endpoint for recent tokens
      const response = await axios.get(
        `${API_BASE_URL}/tokens?sort=created_time%3Adesc&page=1&limit=30`
      )
      
      const recentTokens = response.data.data || []
      
      // Process tokens
      const processedTokens = recentTokens.map((token: ApiToken) => {
        // Check if token is active
        token.price_in_sats = convertPriceToSats(token.price)
        isTokenActive(token)
        return token
      })
      
      setTokens(processedTokens)
    } catch (error) {
      console.error('Failed to fetch recent tokens:', error)
      setError('Failed to load recent tokens')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecentTokens()
  }, [])

  return (
    <div className="recent-tokens">
      <div className="dashboard-header">
        <h1>Recently Launched Tokens</h1>
        <p className="dashboard-description">
          Discover the newest tokens launched on Odin.fun
        </p>
        <div className="dashboard-actions">
          <button 
            className="refresh-button"
            onClick={fetchRecentTokens}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Tokens'}
          </button>
        </div>
      </div>
      
      {loading && tokens.length === 0 ? (
        <div className="loading">Loading recent tokens...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="tokens-grid recent-tokens-grid">
          {tokens.map(token => (
            <div 
              key={token.id} 
              className={`token-card ${token.is_active ? 'active-token' : 'inactive-token'}`}
              onClick={() => window.open(`https://odin.fun/token/${token.id}`, '_blank')}
            >
              <div className="token-header">
                <div className="token-image-wrapper">
                  <img 
                    src={getTokenImageUrl(token.id)} 
                    alt={token.name} 
                    className="token-image" 
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>';
                    }}
                  />
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
                  <span className="detail-value">{formatNumber(token.holder_count)}</span>
                </div>
                <div className="token-detail">
                  <span className="detail-label">Trades</span>
                  <span className="detail-value">{formatNumber(token.buy_count + token.sell_count)}</span>
                </div>
                <div className="token-detail">
                  <span className="detail-label">Created</span>
                  <span className="detail-value">{formatDate(token.created_time)}</span>
                </div>
              </div>
              
              {!token.is_active && (
                <div className="token-inactive-badge">Inactive</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 