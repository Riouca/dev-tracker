import mongoose, { Document, Schema } from 'mongoose'

export interface TokenDocument extends Document {
  id: string
  name: string
  description: string
  image: string
  creator: string
  created_time: string
  volume: number
  bonded: boolean
  icrc_ledger: string
  price: number
  price_in_sats?: number
  price_change_24h?: number
  marketcap: number
  rune: string
  featured: boolean
  holder_count: number
  holder_top: number
  holder_dev: number
  comment_count: number
  sold: number
  twitter: string
  website: string
  telegram: string
  last_comment_time: string | null
  sell_count: number
  buy_count: number
  ticker: string
  btc_liquidity: number
  token_liquidity: number
  user_btc_liquidity: number
  user_token_liquidity: number
  user_lp_tokens: number
  total_supply: number
  swap_fees: number
  swap_fees_24: number
  swap_volume: number
  swap_volume_24: number
  threshold: number
  txn_count: number
  divisibility: number
  decimals: number
  withdrawals: boolean
  deposits: boolean
  trading: boolean
  external: boolean
  lastUpdated: Date
}

const TokenSchema = new Schema<TokenDocument>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  image: { type: String },
  creator: { type: String, required: true },
  created_time: { type: String },
  volume: { type: Number, default: 0 },
  bonded: { type: Boolean, default: false },
  icrc_ledger: { type: String },
  price: { type: Number, default: 0 },
  price_in_sats: { type: Number },
  price_change_24h: { type: Number },
  marketcap: { type: Number, default: 0 },
  rune: { type: String },
  featured: { type: Boolean, default: false },
  holder_count: { type: Number, default: 0 },
  holder_top: { type: Number, default: 0 },
  holder_dev: { type: Number, default: 0 },
  comment_count: { type: Number, default: 0 },
  sold: { type: Number, default: 0 },
  twitter: { type: String },
  website: { type: String },
  telegram: { type: String },
  last_comment_time: { type: String },
  sell_count: { type: Number, default: 0 },
  buy_count: { type: Number, default: 0 },
  ticker: { type: String },
  btc_liquidity: { type: Number, default: 0 },
  token_liquidity: { type: Number, default: 0 },
  user_btc_liquidity: { type: Number, default: 0 },
  user_token_liquidity: { type: Number, default: 0 },
  user_lp_tokens: { type: Number, default: 0 },
  total_supply: { type: Number, default: 0 },
  swap_fees: { type: Number, default: 0 },
  swap_fees_24: { type: Number, default: 0 },
  swap_volume: { type: Number, default: 0 },
  swap_volume_24: { type: Number, default: 0 },
  threshold: { type: Number },
  txn_count: { type: Number, default: 0 },
  divisibility: { type: Number },
  decimals: { type: Number },
  withdrawals: { type: Boolean, default: true },
  deposits: { type: Boolean, default: true },
  trading: { type: Boolean, default: true },
  external: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now }
})

export default mongoose.model<TokenDocument>('Token', TokenSchema) 