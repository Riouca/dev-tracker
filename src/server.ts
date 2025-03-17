import express, { Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { startPeriodicSync } from './db/services/syncService'
import connectToDatabase from './db/config'
import { getAllCreators, getCreatorsWithTokens, getAllTokens } from './db/services/dbService'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Connect to database
connectToDatabase()
  .then(() => {
    console.log('Connected to MongoDB')
    
    // Start periodic sync
    startPeriodicSync()
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err)
    process.exit(1)
  })

// API routes
app.get('/api/creators', async (req: Request, res: Response) => {
  try {
    const creators = await getAllCreators()
    res.json(creators)
  } catch (error) {
    console.error('Error fetching creators:', error)
    res.status(500).json({ error: 'Failed to fetch creators' })
  }
})

app.get('/api/creators/with-tokens', async (req: Request, res: Response) => {
  try {
    const creatorsWithTokens = await getCreatorsWithTokens()
    res.json(creatorsWithTokens)
  } catch (error) {
    console.error('Error fetching creators with tokens:', error)
    res.status(500).json({ error: 'Failed to fetch creators with tokens' })
  }
})

app.get('/api/tokens', async (req: Request, res: Response) => {
  try {
    const tokens = await getAllTokens()
    res.json(tokens)
  } catch (error) {
    console.error('Error fetching tokens:', error)
    res.status(500).json({ error: 'Failed to fetch tokens' })
  }
})

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
}) 