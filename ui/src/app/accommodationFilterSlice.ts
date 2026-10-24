import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from './store'

export type AccommodationFilterValue = 'total' | 'camping' | 'individual'

type AccommodationFilterState = { value: AccommodationFilterValue }

const initialState: AccommodationFilterState = { value: 'total' }

const accommodationFilterSlice = createSlice({
  name: 'accommodationFilter',
  initialState,
  reducers: {
    accommodationFilterChanged(
      state,
      action: PayloadAction<AccommodationFilterValue>,
    ) {
      state.value = action.payload
    },
  },
})

export const { accommodationFilterChanged } = accommodationFilterSlice.actions
export const accommodationFilterReducer = accommodationFilterSlice.reducer
export const selectAccommodationFilter = (state: RootState) =>
  state.accommodationFilter.value
