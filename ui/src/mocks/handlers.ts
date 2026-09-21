import { delay, http, HttpResponse } from 'msw'
import type { CampingProfile } from '../services/api'
import { checkInRequestSchema, type CheckInRequest } from '../checkIn/schema'

// Demo stays live only in this page's memory. A reload starts a fresh demo.
let stays: CheckInRequest[] = []

export function resetDemoStays() {
  stays = []
}

export const handlers = [
  http.get('*/api/camping', async () => {
    await delay(300)
    return HttpResponse.json({
      id: 'demo',
      name: 'Camping La Izuelina',
      currency: 'CLP',
      activeGroups: 8 + stays.length,
      activePeople:
        21 +
        stays.reduce(
          (total, stay) => total + stay.adults + stay.children + stay.infants,
          0,
        ),
      activeVehicles: 6 + stays.filter((stay) => stay.hasVehicle).length,
      pendingAmountMinor: 485000,
    } satisfies CampingProfile)
  }),
  http.post('*/api/stays', async ({ request }) => {
    await delay(300)
    const result = checkInRequestSchema.safeParse(await request.json())
    if (!result.success) return new HttpResponse(null, { status: 400 })
    stays.push(result.data)
    return new HttpResponse(null, { status: 201 })
  }),
]
