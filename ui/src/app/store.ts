import { configureStore } from '@reduxjs/toolkit'
import { api } from '../services/api'
import { accommodationFilterReducer } from './accommodationFilterSlice'

export const createAppStore = () =>
  configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
      accommodationFilter: accommodationFilterReducer,
    },
    middleware: (defaults) => defaults().concat(api.middleware),
  })

export type AppStore = ReturnType<typeof createAppStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
