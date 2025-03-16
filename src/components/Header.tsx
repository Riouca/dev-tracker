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
        <Logo />
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
        </nav>
      </div>
    </header>
  );
}

export default Header; 