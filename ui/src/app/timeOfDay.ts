import { useEffect, useState } from 'react'

export function timeOfDay(hour: number) {
  if (hour >= 6 && hour < 12)
    return { mode: 'light', greeting: 'Buenos días' } as const
  if (hour >= 12 && hour < 19)
    return { mode: 'light', greeting: 'Buenas tardes' } as const
  return { mode: 'dark', greeting: 'Buenas noches' } as const
}

export function useTimeOfDay() {
  const [hour, setHour] = useState(() => new Date().getHours())

  useEffect(() => {
    const update = () => setHour(new Date().getHours())
    const timer = window.setInterval(update, 1000)
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  return timeOfDay(hour)
}
