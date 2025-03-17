import { findTopCreators, CreatorPerformance } from '../../services/api'
import { saveCreators, saveTokens } from './dbService'
import connectToDatabase from '../config'

// Sync interval in milliseconds (default: 15 minutes)
const SYNC_INTERVAL = 15 * 60 * 1000

let isSyncing = false
let syncInterval: NodeJS.Timeout | null = null

/**
 * Sync data from API to database
 */
export async function syncData(): Promise<void> {
  if (isSyncing) {
    console.log('Sync already in progress, skipping...')
    return
  }

  try {
    isSyncing = true
    console.log('Starting data sync...')
    
    // Connect to database
    await connectToDatabase()
    
    // Fetch top creators from API
    const creators = await findTopCreators(100, 'confidence')
    
    // Extract all tokens from creators
    const allTokens = creators.flatMap(creator => creator.tokens)
    
    // Save tokens to database
    await saveTokens(allTokens)
    console.log(`Saved ${allTokens.length} tokens to database`)
    
    // Save creators to database
    await saveCreators(creators)
    console.log(`Saved ${creators.length} creators to database`)
    
    console.log('Data sync completed successfully')
  } catch (error) {
    console.error('Error syncing data:', error)
  } finally {
    isSyncing = false
  }
}

/**
 * Start periodic sync
 */
export function startPeriodicSync(interval = SYNC_INTERVAL): void {
  if (syncInterval) {
    clearInterval(syncInterval)
  }
  
  // Run initial sync
  syncData()
  
  // Set up interval for periodic sync
  syncInterval = setInterval(syncData, interval)
  console.log(`Periodic sync started with interval of ${interval / 1000} seconds`)
}

/**
 * Stop periodic sync
 */
export function stopPeriodicSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
    console.log('Periodic sync stopped')
  }
} 