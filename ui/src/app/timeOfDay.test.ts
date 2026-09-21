import { expect, it } from 'vitest'
import { timeOfDay } from './timeOfDay'

it.each([
  [0, 'dark', 'home.evening'],
  [5, 'dark', 'home.evening'],
  [6, 'light', 'home.morning'],
  [11, 'light', 'home.morning'],
  [12, 'light', 'home.afternoon'],
  [18, 'light', 'home.afternoon'],
  [19, 'dark', 'home.evening'],
  [23, 'dark', 'home.evening'],
])('a las %i usa tema %s y saludo %s', (hour, mode, greeting) => {
  expect(timeOfDay(new Date(2026, 8, 20, hour).getHours())).toEqual({
    mode,
    greeting,
  })
})
