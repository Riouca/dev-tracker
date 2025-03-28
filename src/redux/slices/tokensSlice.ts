import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getNewestTokens, getOlderRecentTokens, calculateCreatorPerformance, Token as ApiToken, CreatorPerformance } from '../../services/api';

export interface TokenWithCreator {
  token: ApiToken;
  creator: CreatorPerformance | null;
}

interface TokensState {
  newestTokens: ApiToken[];
  olderTokens: ApiToken[];
  combinedTokens: TokenWithCreator[];
  filteredTokens: TokenWithCreator[];
  confidenceFilter: string;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  newTokenIds: string[];
  initialLoad: boolean;
}

const initialState: TokensState = {
  newestTokens: [],
  olderTokens: [],
  combinedTokens: [],
  filteredTokens: [],
  confidenceFilter: 'all',
  loading: true,
  error: null,
  lastUpdated: null,
  newTokenIds: [],
  initialLoad: true
};

// Async thunks for fetching tokens
export const fetchNewestTokens = createAsyncThunk(
  'tokens/fetchNewest',
  async () => {
    const response = await getNewestTokens();
    console.log(`Fetched ${response.length} newest tokens`);
    return response;
  }
);

export const fetchOlderTokens = createAsyncThunk(
  'tokens/fetchOlder',
  async (limit: number = 20) => {
    const response = await getOlderRecentTokens(limit, 4);
    console.log(`Fetched ${response.length} older tokens`);
    return response;
  }
);

// Async thunk for processing tokens with creator data
export const processTokensWithCreators = createAsyncThunk(
  'tokens/processWithCreators',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { tokens: TokensState };
      const { newestTokens, olderTokens, combinedTokens } = state.tokens;
      
      console.log("🔄 Processing tokens with creators");
      
      // Create a map of token IDs for quick lookup to eliminate duplicates
      const tokenMap = new Map<string, ApiToken>();
      
      // Add newest tokens to the map first (they take priority)
      if (newestTokens && newestTokens.length > 0) {
        console.log(`📌 Adding ${newestTokens.length} newest tokens to the map`);
        newestTokens.forEach(token => {
          tokenMap.set(token.id, token);
        });
      }
      
      // Add older tokens to the map only if they don't already exist
      if (olderTokens && olderTokens.length > 0) {
        console.log(`📌 Adding ${olderTokens.length} older tokens to the map`);
        olderTokens.forEach(token => {
          if (!tokenMap.has(token.id)) {
            tokenMap.set(token.id, token);
          }
        });
      }
      
      // Convert the map back to an array, sorted by creation time (newest first)
      const allTokens = Array.from(tokenMap.values())
        .sort((a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime());
      
      console.log(`📋 Combined ${allTokens.length} tokens (without duplicates)`);
      
      // Check for new tokens by comparing with previous combined tokens
      const previousTokenIds = new Set(combinedTokens.map(({ token }) => token.id));
      const newTokenIds: string[] = [];
      
      if (combinedTokens.length > 0 && !state.tokens.initialLoad) {
        allTokens.forEach(token => {
          if (!previousTokenIds.has(token.id)) {
            newTokenIds.push(token.id);
          }
        });
      }
      
      if (newTokenIds.length > 0) {
        console.log(`🎯 Found ${newTokenIds.length} new tokens for highlighting`);
      }
      
      // Process tokens with creator data
      const processedTokens: TokenWithCreator[] = [];
      const creatorCache = new Map<string, CreatorPerformance | null>();
      
      for (const token of allTokens) {
        try {
          // Check if we already have data for this creator
          let creatorData = creatorCache.get(token.creator);
          
          // If not, fetch it
          if (creatorData === undefined) {
            // Check if we have it in existing combined tokens first
            const existingTokenWithCreator = combinedTokens.find(
              item => item.token.creator === token.creator
            );
            
            if (existingTokenWithCreator?.creator) {
              creatorData = existingTokenWithCreator.creator;
            } else {
              creatorData = await calculateCreatorPerformance(token.creator, true);
            }
            
            creatorCache.set(token.creator, creatorData);
          }
          
          // Add token with creator to processed list
          processedTokens.push({
            token,
            creator: creatorData
          });
        } catch (error) {
          console.error(`Error processing token ${token.id}:`, error);
          processedTokens.push({
            token,
            creator: null
          });
        }
      }
      
      console.log(`✅ Processed ${processedTokens.length} tokens with creators`);
      
      return {
        tokens: processedTokens,
        newTokenIds
      };
    } catch (error) {
      console.error("Failed to process tokens with creators:", error);
      return rejectWithValue("Failed to process token data. Please try again later.");
    }
  }
);

// Helper function to filter tokens by confidence
const filterTokensByConfidence = (tokensToFilter: TokenWithCreator[], confidenceFilter: string): TokenWithCreator[] => {
  if (confidenceFilter === 'all') {
    return tokensToFilter;
  }
  
  return tokensToFilter.filter(({ creator }) => {
    if (!creator) return false;
    
    const score = creator.confidenceScore;
    
    switch (confidenceFilter) {
      case 'legendary':
        return score >= 90;
      case 'high':
        return score >= 70 && score < 90;
      case 'medium':
        return score >= 50 && score < 70;
      case 'low':
        return score < 50;
      default:
        return true;
    }
  });
};

const tokensSlice = createSlice({
  name: 'tokens',
  initialState,
  reducers: {
    setConfidenceFilter: (state, action: PayloadAction<string>) => {
      state.confidenceFilter = action.payload;
      state.filteredTokens = filterTokensByConfidence(state.combinedTokens, action.payload);
    },
    clearNewTokenHighlight: (state) => {
      state.newTokenIds = [];
    },
    setInitialLoadComplete: (state) => {
      state.initialLoad = false;
    },
    preloadTokensData: (state, action: PayloadAction<{newestTokens: ApiToken[], recentTokens: ApiToken[]}>) => {
      // Mettre à jour les données directement depuis les données préchargées
      state.newestTokens = action.payload.newestTokens;
      state.olderTokens = action.payload.recentTokens.filter(token => 
        !state.newestTokens.some(newToken => newToken.id === token.id)
      );
      state.loading = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Newest tokens
      .addCase(fetchNewestTokens.pending, (state) => {
        // Don't set loading true if we already have data
        if (state.combinedTokens.length === 0) {
          state.loading = true;
        }
      })
      .addCase(fetchNewestTokens.fulfilled, (state, action) => {
        state.newestTokens = action.payload;
        state.error = null;
      })
      .addCase(fetchNewestTokens.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch newest tokens';
        state.loading = false;
      })
      
      // Older tokens
      .addCase(fetchOlderTokens.pending, (state) => {
        // Don't set loading true if we already have data
        if (state.combinedTokens.length === 0) {
          state.loading = true;
        }
      })
      .addCase(fetchOlderTokens.fulfilled, (state, action) => {
        state.olderTokens = action.payload;
        state.error = null;
      })
      .addCase(fetchOlderTokens.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch older tokens';
        state.loading = false;
      })
      
      // Process tokens with creators
      .addCase(processTokensWithCreators.pending, (state) => {
        // Don't set loading true if we already have data
        if (state.combinedTokens.length === 0) {
          state.loading = true;
        }
      })
      .addCase(processTokensWithCreators.fulfilled, (state, action) => {
        state.combinedTokens = action.payload.tokens;
        state.filteredTokens = filterTokensByConfidence(action.payload.tokens, state.confidenceFilter);
        state.newTokenIds = action.payload.newTokenIds;
        state.lastUpdated = new Date().toISOString();
        state.loading = false;
        state.error = null;
        
        // Schedule clearing new token highlights
        setTimeout(() => {
          store.dispatch(clearNewTokenHighlight());
        }, 3000);
      })
      .addCase(processTokensWithCreators.rejected, (state, action) => {
        state.error = action.payload as string || 'Failed to process tokens';
        state.loading = false;
      });
  }
});

export const { setConfidenceFilter, clearNewTokenHighlight, setInitialLoadComplete, preloadTokensData } = tokensSlice.actions;

// For dispatching the store later
let store: any;
export const injectStore = (_store: any) => {
  store = _store;
};

export default tokensSlice.reducer; 