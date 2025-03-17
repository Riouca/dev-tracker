import dotenv from 'dotenv'
import { findTopCreators } from './services/api'
import connectToDatabase from './db/config'
import { saveCreators, saveTokens, getAllCreators, getAllTokens } from './db/services/dbService'

// Load environment variables
dotenv.config()

async function testDatabaseImplementation() {
  try {
    console.log('Starting database test...')
    
    // Connect to database
    await connectToDatabase()
    console.log('Connected to MongoDB')
    
    // Fetch a small sample of creators from API
    console.log('Fetching creators from API...')
    const creators = await findTopCreators(10, 'confidence')
    console.log(`Fetched ${creators.length} creators from API`)
    
    // Extract tokens from creators
    const tokens = creators.flatMap(creator => creator.tokens)
    console.log(`Extracted ${tokens.length} tokens from creators`)
    
    // Save tokens to database
    console.log('Saving tokens to database...')
    await saveTokens(tokens)
    console.log('Tokens saved to database')
    
    // Save creators to database
    console.log('Saving creators to database...')
    await saveCreators(creators)
    console.log('Creators saved to database')
    
    // Retrieve creators from database
    console.log('Retrieving creators from database...')
    const dbCreators = await getAllCreators()
    console.log(`Retrieved ${dbCreators.length} creators from database`)
    
    // Retrieve tokens from database
    console.log('Retrieving tokens from database...')
    const dbTokens = await getAllTokens()
    console.log(`Retrieved ${dbTokens.length} tokens from database`)
    
    // Verify data
    console.log('\nVerification:')
    console.log(`API Creators: ${creators.length}, DB Creators: ${dbCreators.length}`)
    console.log(`API Tokens: ${tokens.length}, DB Tokens: ${dbTokens.length}`)
    
    // Print sample data
    if (dbCreators.length > 0) {
      console.log('\nSample Creator from Database:')
      console.log(JSON.stringify(dbCreators[0], null, 2))
    }
    
    if (dbTokens.length > 0) {
      console.log('\nSample Token from Database:')
      console.log(JSON.stringify(dbTokens[0], null, 2))
    }
    
    console.log('\nDatabase test completed successfully!')
  } catch (error) {
    console.error('Error during database test:', error)
  } finally {
    // Exit process
    process.exit(0)
  }
}

// Run the test
testDatabaseImplementation() 