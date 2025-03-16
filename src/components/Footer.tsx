function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-info">
          <p className="copyright">© {currentYear} ForsetiScan</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer 