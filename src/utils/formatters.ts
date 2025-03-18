/**
 * Format a price value to display in sats
 */
export function formatPrice(price: number): string {
  const priceInSats = price / 1000
  return `${priceInSats.toFixed(2)} sats`
}

/**
 * Format a date string to a readable format
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format a number with K, M, B suffixes
 */
export function formatNumber(num: number): string {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

/**
 * Get time elapsed since a date
 */
export function getTimeSince(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffDay > 0) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
  } else if (diffHour > 0) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
  } else if (diffMin > 0) {
    return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`
  } else {
    return 'just now'
  }
}

/**
 * Calculates and formats the percentage of tokens held by the developer
 * @param developerHoldings The amount of tokens held by the developer
 * @param totalSupply The total supply of the token
 * @returns Formatted percentage string
 */
export function formatDeveloperHoldings(developerHoldings: number, totalSupply: number): string {
  if (!developerHoldings || !totalSupply || totalSupply === 0) {
    return '0%';
  }
  
  const percentage = (developerHoldings / totalSupply) * 100;
  
  // Format based on the size of the percentage
  if (percentage < 0.01) {
    return '<0.01%';
  } else if (percentage < 1) {
    return percentage.toFixed(2) + '%';
  } else if (percentage < 10) {
    return percentage.toFixed(1) + '%';
  } else {
    return Math.round(percentage) + '%';
  }
} 