import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { CheckInRequest } from '../checkIn/schema'

export type Camping = {
  id: string
  name: string
  currency: string
}

export type CampingProfile = Camping & {
  activeGroups: number
  activePeople: number
  activeVehicles: number
  pendingAmountMinor: number
}

export const api = createApi({
  reducerPath: 'api',
  tagTypes: ['Camping'],
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || '/api',
  }),
  endpoints: (builder) => ({
    createStay: builder.mutation<void, CheckInRequest>({
      query: (body) => ({ url: '/stays', method: 'POST', body }),
      invalidatesTags: (_result, error) => (error ? [] : ['Camping']),
    }),
    camping: builder.query<CampingProfile, void>({
      query: () => '/camping',
      providesTags: ['Camping'],
      transformResponse: (response: unknown): CampingProfile => {
        if (
          typeof response !== 'object' ||
          response === null ||
          !('id' in response) ||
          typeof response.id !== 'string' ||
          !('name' in response) ||
          typeof response.name !== 'string' ||
          !('currency' in response) ||
          typeof response.currency !== 'string' ||
          !/^[A-Z]{3}$/.test(response.currency) ||
          !('activeGroups' in response) ||
          typeof response.activeGroups !== 'number' ||
          !('activePeople' in response) ||
          typeof response.activePeople !== 'number' ||
          !('activeVehicles' in response) ||
          typeof response.activeVehicles !== 'number' ||
          !('pendingAmountMinor' in response) ||
          typeof response.pendingAmountMinor !== 'number' ||
          ![
            response.activeGroups,
            response.activePeople,
            response.activeVehicles,
            response.pendingAmountMinor,
          ].every((value) => Number.isSafeInteger(value) && value >= 0)
        ) {
          throw new Error('Respuesta de camping inválida')
        }
        return {
          id: response.id,
          name: response.name,
          currency: response.currency,
          activeGroups: response.activeGroups,
          activePeople: response.activePeople,
          activeVehicles: response.activeVehicles,
          pendingAmountMinor: response.pendingAmountMinor,
        }
      },
    }),
  }),
})

export const { useCampingQuery, useCreateStayMutation } = api
