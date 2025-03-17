import TokenModel, { TokenDocument } from '../models/Token'
import CreatorModel, { CreatorDocument } from '../models/Creator'
import { Token, CreatorPerformance } from '../../services/api'

// Token operations
export async function saveToken(token: Token): Promise<TokenDocument> {
  try {
    const existingToken = await TokenModel.findOne({ id: token.id })
    
    if (existingToken) {
      // Update existing token
      Object.assign(existingToken, {
        ...token,
        lastUpdated: new Date()
      })
      return await existingToken.save()
    } else {
      // Create new token
      const newToken = new TokenModel({
        ...token,
        lastUpdated: new Date()
      })
      return await newToken.save()
    }
  } catch (error) {
    console.error('Error saving token:', error)
    throw error
  }
}

export async function saveTokens(tokens: Token[]): Promise<TokenDocument[]> {
  try {
    const savedTokens = await Promise.all(tokens.map(token => saveToken(token)))
    return savedTokens
  } catch (error) {
    console.error('Error saving tokens:', error)
    throw error
  }
}

export async function getTokenById(id: string): Promise<TokenDocument | null> {
  try {
    return await TokenModel.findOne({ id })
  } catch (error) {
    console.error('Error getting token by ID:', error)
    throw error
  }
}

export async function getAllTokens(): Promise<TokenDocument[]> {
  try {
    return await TokenModel.find().sort({ lastUpdated: -1 })
  } catch (error) {
    console.error('Error getting all tokens:', error)
    throw error
  }
}

// Creator operations
export async function saveCreator(creator: CreatorPerformance): Promise<CreatorDocument> {
  try {
    const existingCreator = await CreatorModel.findOne({ principal: creator.principal })
    
    if (existingCreator) {
      // Update existing creator
      Object.assign(existingCreator, {
        ...creator,
        tokens: creator.tokens.map(token => token.id),
        lastUpdated: new Date()
      })
      return await existingCreator.save()
    } else {
      // Create new creator
      const newCreator = new CreatorModel({
        ...creator,
        tokens: creator.tokens.map(token => token.id),
        lastUpdated: new Date()
      })
      return await newCreator.save()
    }
  } catch (error) {
    console.error('Error saving creator:', error)
    throw error
  }
}

export async function saveCreators(creators: CreatorPerformance[]): Promise<CreatorDocument[]> {
  try {
    const savedCreators = await Promise.all(creators.map(creator => saveCreator(creator)))
    return savedCreators
  } catch (error) {
    console.error('Error saving creators:', error)
    throw error
  }
}

export async function getCreatorByPrincipal(principal: string): Promise<CreatorDocument | null> {
  try {
    return await CreatorModel.findOne({ principal })
  } catch (error) {
    console.error('Error getting creator by principal:', error)
    throw error
  }
}

export async function getAllCreators(): Promise<CreatorDocument[]> {
  try {
    return await CreatorModel.find().sort({ confidenceScore: -1 })
  } catch (error) {
    console.error('Error getting all creators:', error)
    throw error
  }
}

export async function getCreatorsWithTokens(): Promise<any[]> {
  try {
    const creators = await CreatorModel.find().sort({ confidenceScore: -1 })
    
    // For each creator, fetch their tokens
    const creatorsWithTokens = await Promise.all(
      creators.map(async (creator) => {
        const tokens = await TokenModel.find({ id: { $in: creator.tokens } })
        return {
          ...creator.toObject(),
          tokens
        }
      })
    )
    
    return creatorsWithTokens
  } catch (error) {
    console.error('Error getting creators with tokens:', error)
    throw error
  }
} 