import { configureStore } from '@reduxjs/toolkit';
import tokensReducer, { injectStore } from './slices/tokensSlice';

const store = configureStore({
  reducer: {
    tokens: tokensReducer
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// Injecter le store dans le tokensSlice pour les dispatches internes
injectStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store; 