import { configureStore } from '@reduxjs/toolkit'
import { api } from '../services/api'

export const createAppStore = () =>
  configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (defaults) => defaults().concat(api.middleware),
  })
