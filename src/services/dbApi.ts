import axios from 'axios'
import { CreatorPerformance, Token } from './api'

const API_BASE_URL = 'http://localhost:3001/api'

// Cache keys
const CREATORS_CACHE_KEY = 'db_creators_data'
const CREATORS_WITH_TOKENS_CACHE_KEY = 'db_creators_with_tokens_data'
const TOKENS_CACHE_KEY = 'db_tokens_data'
const CACHE_TIMESTAMP_KEY = 'db_cache_timestamp'

// Cache expiry time (15 minutes)
const CACHE_EXPIRY_TIME = 15 * 60 * 1000

/**
 * Fetch all creators from the database
 */
export async function fetchCreators(): Promise<CreatorPerformance[]> {
  try {
    // Check if we have cached data
    const cachedData = sessionStorage.getItem(CREATORS_CACHE_KEY)
    const cachedTimestamp = sessionStorage.getItem(CACHE_TIMESTAMP_KEY)
    
    // If we have cached data and it's not expired, use it
    if (cachedData && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp, 10)
      const now = Date.now()
      
      // Check if cache is still valid (not expired)
      if (now - timestamp < CACHE_EXPIRY_TIME) {
        console.log('Using cached creators data from session storage')
        return JSON.parse(cachedData)
      }
    }
    
    // Fetch data from API
    const response = await axios.get(`${API_BASE_URL}/creators`)
    const creators = response.data
    
    // Cache the data
    sessionStorage.setItem(CREATORS_CACHE_KEY, JSON.stringify(creators))
    sessionStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
    
    return creators
  } catch (error) {
    console.error('Error fetching creators from database:', error)
    throw error
  }
}

/**
 * Fetch all creators with their tokens from the database
 */
export async function fetchCreatorsWithTokens(): Promise<CreatorPerformance[]> {
  try {
    // Check if we have cached data
    const cachedData = sessionStorage.getItem(CREATORS_WITH_TOKENS_CACHE_KEY)
    const cachedTimestamp = sessionStorage.getItem(CACHE_TIMESTAMP_KEY)
    
    // If we have cached data and it's not expired, use it
    if (cachedData && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp, 10)
      const now = Date.now()
      
      // Check if cache is still valid (not expired)
      if (now - timestamp < CACHE_EXPIRY_TIME) {
        console.log('Using cached creators with tokens data from session storage')
        return JSON.parse(cachedData)
      }
    }
    
    // Fetch data from API
    const response = await axios.get(`${API_BASE_URL}/creators/with-tokens`)
    const creatorsWithTokens = response.data
    
    // Cache the data
    sessionStorage.setItem(CREATORS_WITH_TOKENS_CACHE_KEY, JSON.stringify(creatorsWithTokens))
    sessionStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
    
    return creatorsWithTokens
  } catch (error) {
    console.error('Error fetching creators with tokens from database:', error)
    throw error
  }
}

/**
 * Fetch all tokens from the database
 */
export async function fetchTokens(): Promise<Token[]> {
  try {
    // Check if we have cached data
    const cachedData = sessionStorage.getItem(TOKENS_CACHE_KEY)
    const cachedTimestamp = sessionStorage.getItem(CACHE_TIMESTAMP_KEY)
    
    // If we have cached data and it's not expired, use it
    if (cachedData && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp, 10)
      const now = Date.now()
      
      // Check if cache is still valid (not expired)
      if (now - timestamp < CACHE_EXPIRY_TIME) {
        console.log('Using cached tokens data from session storage')
        return JSON.parse(cachedData)
      }
    }
    
    // Fetch data from API
    const response = await axios.get(`${API_BASE_URL}/tokens`)
    const tokens = response.data
    
    // Cache the data
    sessionStorage.setItem(TOKENS_CACHE_KEY, JSON.stringify(tokens))
    sessionStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
    
    return tokens
  } catch (error) {
    console.error('Error fetching tokens from database:', error)
    throw error
  }
} 