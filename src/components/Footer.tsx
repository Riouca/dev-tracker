function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-links">
          <a 
            href="https://odin.fun" 
            target="_blank" 
            rel="noopener noreferrer"
            className="footer-link"
          >
            Odin.fun
          </a>
          <a 
            href="https://x.com/DraugrDev" 
            target="_blank" 
            rel="noopener noreferrer"
            className="footer-link social-link"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span></span>
          </a>
        </div>
        <div className="footer-info">
          <p className="copyright">© {currentYear} ForsetiScan</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer 