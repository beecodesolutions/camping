import { delay, http, HttpResponse } from 'msw'
import type { CampingProfile } from '../services/api'

export const handlers = [
  http.get('*/api/camping', async () => {
    await delay(300)
    return HttpResponse.json({
      id: 'demo',
      name: 'Camping La Izuelina',
      currency: 'CLP',
      activeGroups: 8,
      activePeople: 21,
      activeVehicles: 6,
      pendingAmountMinor: 485000,
    } satisfies CampingProfile)
  }),
]
