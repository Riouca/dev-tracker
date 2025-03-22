import Logo from './Logo'
import { useState } from 'react'

type Page = 'dashboard' | 'recent' | 'search'

interface HeaderProps {
  currentPage: Page
  onPageChange: (page: Page) => void
}

function Header({ currentPage, onPageChange }: HeaderProps) {
  const [showInfoModal, setShowInfoModal] = useState(false)
  
  const toggleInfoModal = () => {
    setShowInfoModal(!showInfoModal)
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
            Dashboard
          </button>
          <button 
            className={`nav-link ${currentPage === 'recent' ? 'active' : ''}`}
            onClick={() => onPageChange('recent')}
          >
            Recent Tokens
          </button>
          <button 
            className={`nav-link ${currentPage === 'search' ? 'active' : ''}`}
            onClick={() => onPageChange('search')}
          >
            Search
          </button>
          <button 
            className="nav-link info-link"
            onClick={toggleInfoModal}
          >
            Scoring Guide
          </button>
        </nav>
      </div>
      
      {showInfoModal && (
        <div className="modal-overlay" onClick={toggleInfoModal}>
          <div className="info-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confidence Score System</h2>
              <button className="close-button" onClick={toggleInfoModal}>×</button>
            </div>
            <div className="modal-content">
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
              
              <div className="info-footer">
                <p>Scores are periodically recalculated to ensure accurate data.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header; 