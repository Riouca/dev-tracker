function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-info">
          <p className="disclaimer">This tool is unofficial and should be used at your own risk.</p>
          <p className="copyright">© {currentYear} OdinTracker</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer 