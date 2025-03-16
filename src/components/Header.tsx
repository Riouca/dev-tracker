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
        </nav>
      </div>
    </header>
  );
}

export default Header; 