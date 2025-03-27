import Logo from './Logo'
import { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'

type Page = 'dashboard' | 'recent' | 'search' | 'favorites'

interface HeaderProps {
  currentPage: Page
  onPageChange: (page: Page) => void
}

function Header({ currentPage, onPageChange }: HeaderProps) {
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [followedCount, setFollowedCount] = useState(0)
  
  // Get followed count on mount and when it changes
  useEffect(() => {
    const updateFollowedCount = () => {
      try {
        const followedCreators = JSON.parse(localStorage.getItem('followedCreators') || '[]')
        setFollowedCount(Array.isArray(followedCreators) ? followedCreators.length : 0)
      } catch (error) {
        console.error('Error parsing followed creators:', error)
        setFollowedCount(0)
      }
    }
    
    // Initial count
    updateFollowedCount()
    
    // Listen for changes
    window.addEventListener('storage', updateFollowedCount)
    window.addEventListener('followStatusChanged', updateFollowedCount)
    
    return () => {
      window.removeEventListener('storage', updateFollowedCount)
      window.removeEventListener('followStatusChanged', updateFollowedCount)
    }
  }, [])
  
  const toggleInfoModal = () => {
    setShowInfoModal(!showInfoModal)
  }
  
  // Render modal outside of the header component using portal
  const renderModal = () => {
    if (!showInfoModal) return null
    
    return ReactDOM.createPortal(
      <div className="modal-overlay" onClick={toggleInfoModal}>
        <div className="info-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Developer Guide</h2>
            <button className="close-button" onClick={toggleInfoModal}>×</button>
          </div>
          <div className="modal-content">
            <section className="tier-explanation">
              <h3>Confidence Tiers</h3>
              <p>Developers are ranked into tiers based on their overall confidence score:</p>
              <div className="tiers-list">
                <div className="tier legendary">
                  <div className="tier-header">
                    <span className="tier-name">Legendary</span>
                    <span className="tier-range">100%</span>
                  </div>
                  <p>Perfect score across all metrics. Extremely rare.</p>
                </div>
                <div className="tier epic">
                  <div className="tier-header">
                    <span className="tier-name">Epic</span>
                    <span className="tier-range">90-99%</span>
                  </div>
                  <p>Top-tier developers with excellent track records.</p>
                </div>
                <div className="tier great">
                  <div className="tier-header">
                    <span className="tier-name">Great</span>
                    <span className="tier-range">80-89%</span>
                  </div>
                  <p>Highly reliable developers with strong performance.</p>
                </div>
                <div className="tier okay">
                  <div className="tier-header">
                    <span className="tier-name">Okay</span>
                    <span className="tier-range">70-79%</span>
                  </div>
                  <p>Solid developers with good track records.</p>
                </div>
                <div className="tier neutral">
                  <div className="tier-header">
                    <span className="tier-name">Neutral</span>
                    <span className="tier-range">60-69%</span>
                  </div>
                  <p>Average developers with mixed results.</p>
                </div>
                <div className="tier meh">
                  <div className="tier-header">
                    <span className="tier-name">Meh</span>
                    <span className="tier-range">45-59%</span>
                  </div>
                  <p>Below average track record with some failed tokens.</p>
                </div>
                <div className="tier scam">
                  <div className="tier-header">
                    <span className="tier-name">Scam</span>
                    <span className="tier-range">0-44%</span>
                  </div>
                  <p>Poor track record with many failed tokens. High risk.</p>
                </div>
              </div>
            </section>
            
            <section className="score-explanation">
              <h3>How Confidence Scores Work</h3>
              <p>
                The confidence score evaluates developers based on their track record of creating 
                successful tokens. It combines five key metrics:
              </p>
              <div className="metrics-list">
                <div className="metric-item">
                  <div className="metric-header">
                    <span className="metric-name">Success Rate</span>
                    <span className="metric-weight">33%</span>
                  </div>
                  <p>Percentage of a developer's tokens that remain active with healthy price levels</p>
                </div>
                <div className="metric-item">
                  <div className="metric-header">
                    <span className="metric-name">Volume</span>
                    <span className="metric-weight">33%</span>
                  </div>
                  <p>Total trading volume across all tokens</p>
                </div>
                <div className="metric-item">
                  <div className="metric-header">
                    <span className="metric-name">Holders</span>
                    <span className="metric-weight">15%</span>
                  </div>
                  <p>Total number of unique token holders</p>
                </div>
                <div className="metric-item">
                  <div className="metric-header">
                    <span className="metric-name">Generated Marketcap</span>
                    <span className="metric-weight">15%</span>
                  </div>
                  <p>Total value created above the baseline minting cost</p>
                </div>
                <div className="metric-item">
                  <div className="metric-header">
                    <span className="metric-name">Trades</span>
                    <span className="metric-weight">4%</span>
                  </div>
                  <p>Total number of buy/sell transactions</p>
                </div>
              </div>
            </section>
            
            <section className="score-explanation">
              <h3>App Features</h3>
              <p>ForsetiScan offers several tools to help you discover and track the most reliable token creators:</p>
              <div className="metrics-list">
                <div className="metric-item">
                  <div className="metric-header">
                    <span className="metric-name">Leaderboard</span>
                    <span className="metric-weight">🏆</span>
                  </div>
                  <p>Discover the most reliable token creators ranked by their confidence scores. Find developers with proven track records and make informed investment decisions.</p>
                </div>
                <div className="metric-item">
                  <div className="metric-header">
                    <span className="metric-name">Recent Tokens</span>
                    <span className="metric-weight">🕒</span>
                  </div>
                  <p>Stay ahead of the curve with real-time updates on newly launched tokens. Get in early by discovering promising projects as soon as they launch.</p>
                </div>
                <div className="metric-item">
                  <div className="metric-header">
                    <span className="metric-name">Search</span>
                    <span className="metric-weight">🔍</span>
                  </div>
                  <p>Find specific developers or tokens by name or identifier. Locate exactly what you're looking for with our powerful search functionality.</p>
                </div>
                <div className="metric-item">
                  <div className="metric-header">
                    <span className="metric-name">Favorites</span>
                    <span className="metric-weight">⭐</span>
                  </div>
                  <p>Create your personalized watchlist of top developers. Follow creators you trust to stay updated on their latest projects and token launches.</p>
                </div>
              </div>
            </section>
            
            <div className="info-footer">
              <p>Scores are periodically recalculated to ensure accurate data.</p>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  }
  
  return (
    <header className="app-header">
      <div className="header-content">
        <div className="logo">
          <Logo />
          <span className="logo-text">ForsetiScan</span>
        </div>
        <nav className="main-nav">
          <button 
            className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => onPageChange('dashboard')}
          >
            🏆 Leaderboard
          </button>
          <button 
            className={`nav-link ${currentPage === 'recent' ? 'active' : ''}`}
            onClick={() => onPageChange('recent')}
          >
            🕒 Recent Tokens
          </button>
          <button 
            className={`nav-link ${currentPage === 'search' ? 'active' : ''}`}
            onClick={() => onPageChange('search')}
          >
            🔍 Search
          </button>
          <button 
            className={`nav-link ${currentPage === 'favorites' ? 'active' : ''}`}
            onClick={() => onPageChange('favorites')}
          >
            ⭐ Favorites {followedCount > 0 && <span>({followedCount})</span>}
          </button>
          <button 
            className="nav-link"
            onClick={toggleInfoModal}
          >
            ❓ Guide
          </button>
        </nav>
      </div>
      
      {renderModal()}
    </header>
  );
}

export default Header; 