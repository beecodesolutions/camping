import { expect, it } from 'vitest'
import { api } from '../services/api'
import { createAppStore } from './store'
import {
  accommodationFilterChanged,
  selectAccommodationFilter,
} from './accommodationFilterSlice'

it('comparte la selección y la conserva al reiniciar los datos consultados', () => {
  const store = createAppStore()
  expect(selectAccommodationFilter(store.getState())).toBe('total')

  store.dispatch(accommodationFilterChanged('camping'))
  expect(selectAccommodationFilter(store.getState())).toBe('camping')

  store.dispatch(api.util.resetApiState())
  expect(selectAccommodationFilter(store.getState())).toBe('camping')

  store.dispatch(accommodationFilterChanged('individual'))
  expect(selectAccommodationFilter(store.getState())).toBe('individual')
  expect(selectAccommodationFilter(createAppStore().getState())).toBe('total')
})
