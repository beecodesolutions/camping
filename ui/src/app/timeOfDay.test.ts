import { expect, it } from 'vitest'
import { timeOfDay } from './timeOfDay'

it.each([
  [0, 'dark', 'Buenas noches'],
  [5, 'dark', 'Buenas noches'],
  [6, 'light', 'Buenos días'],
  [11, 'light', 'Buenos días'],
  [12, 'light', 'Buenas tardes'],
  [18, 'light', 'Buenas tardes'],
  [19, 'dark', 'Buenas noches'],
  [23, 'dark', 'Buenas noches'],
])('a las %i usa tema %s y saludo %s', (hour, mode, greeting) => {
  expect(timeOfDay(new Date(2026, 8, 20, hour).getHours())).toEqual({
    mode,
    greeting,
  })
})
