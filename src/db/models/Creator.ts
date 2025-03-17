import mongoose, { Document, Schema } from 'mongoose'

export interface CreatorDocument extends Document {
  principal: string
  username: string
  image: string | null
  totalTokens: number
  activeTokens: number
  totalVolume: number
  btcVolume?: number
  successRate: number
  weightedScore: number
  confidenceScore: number
  rank?: number
  totalHolders?: number
  totalTrades?: number
  tokens: string[] // Array of token IDs
  lastTokenCreated?: string
  lastUpdated: Date
}

const CreatorSchema = new Schema<CreatorDocument>({
  principal: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  image: { type: String },
  totalTokens: { type: Number, default: 0 },
  activeTokens: { type: Number, default: 0 },
  totalVolume: { type: Number, default: 0 },
  btcVolume: { type: Number },
  successRate: { type: Number, default: 0 },
  weightedScore: { type: Number, default: 0 },
  confidenceScore: { type: Number, default: 0 },
  rank: { type: Number },
  totalHolders: { type: Number },
  totalTrades: { type: Number },
  tokens: [{ type: String }], // Array of token IDs
  lastTokenCreated: { type: String },
  lastUpdated: { type: Date, default: Date.now }
})

export default mongoose.model<CreatorDocument>('Creator', CreatorSchema) 