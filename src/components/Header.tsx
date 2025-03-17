import Logo from './Logo'

type Page = 'dashboard' | 'recent' | 'search'

interface HeaderProps {
  currentPage: Page
  onPageChange: (page: Page) => void
}

function Header({ currentPage, onPageChange }: HeaderProps) {
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
          <a 
            href="https://odin.fun" 
            target="_blank" 
            rel="noopener noreferrer"
            className="nav-link external"
          >
            Odin.fun
          </a>
          <a 
            href="https://x.com/DraugrDev" 
            target="_blank" 
            rel="noopener noreferrer"
            className="nav-link social-link"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span className="sr-only">X (Twitter)</span>
          </a>
        </nav>
      </div>
    </header>
  );
}

export default Header; 