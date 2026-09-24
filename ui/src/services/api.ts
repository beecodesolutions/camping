import {
  createApi,
  fetchBaseQuery,
  type BaseQueryApi,
  type FetchArgs,
} from '@reduxjs/toolkit/query/react'
import {
  campingProfileSchema,
  extraTemplateSchema,
  sessionUserSchema,
  stayPageSchema,
  stayQuoteSchema,
  staySchema,
} from '@camping/contracts'
import type {
  CampingProfile,
  CheckInRequest,
  ExtraTemplate,
  PaymentInput,
  SessionUser,
  Stay,
  StayPage,
  StayQuote,
} from '@camping/contracts'
import type { ZodType } from 'zod'
export type { CampingProfile } from '@camping/contracts'

import type {
  LoginInput,
  ExtraTemplateInput,
  ExtraTemplatePatch,
  AddExtraInput,
  RateInput,
} from './types'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || '/api',
  credentials: 'include',
})

const baseQuery = async (
  args: string | FetchArgs,
  api: BaseQueryApi,
  extra: Record<string, unknown>,
) => {
  const result = await rawBaseQuery(args, api, extra)
  if (
    result.error?.status === 401 &&
    api.endpoint !== 'session' &&
    api.endpoint !== 'login'
  ) {
    api.dispatch(apiSlice.util.resetApiState())
  }
  return result
}

const parse = <T>(schema: ZodType<T>, response: unknown): T =>
  schema.parse(response)
const createStayResponseSchema = sessionUserSchema.pick({ id: true })

export const apiSlice = createApi({
  reducerPath: 'api',
  tagTypes: ['Session', 'Camping', 'Stays', 'Stay', 'Templates'],
  baseQuery,
  endpoints: (builder) => ({
    session: builder.query<SessionUser, void>({
      query: () => '/auth/session',
      transformResponse: (response) => parse(sessionUserSchema, response),
      providesTags: ['Session'],
    }),
    login: builder.mutation<SessionUser, LoginInput>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      transformResponse: (response) => parse(sessionUserSchema, response),
      invalidatesTags: ['Session', 'Camping', 'Stays'],
    }),
    logout: builder.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled
          dispatch(apiSlice.util.resetApiState())
        } catch {
          /* keep the form available for retry */
        }
      },
      invalidatesTags: ['Session', 'Camping', 'Stays', 'Stay', 'Templates'],
    }),
    camping: builder.query<CampingProfile, void>({
      query: () => '/camping',
      transformResponse: (response) => parse(campingProfileSchema, response),
      providesTags: ['Camping'],
    }),
    stays: builder.query<
      StayPage,
      { status: 'active' | 'closed'; page: number; pageSize: number }
    >({
      query: ({ status, page, pageSize }) =>
        `/stays?status=${status}&page=${page}&pageSize=${pageSize}`,
      transformResponse: (response) => parse(stayPageSchema, response),
      providesTags: (result) =>
        result
          ? [
              { type: 'Stays', id: 'LIST' },
              ...result.items.map((stay) => ({
                type: 'Stay' as const,
                id: stay.id,
              })),
            ]
          : [{ type: 'Stays', id: 'LIST' }],
    }),
    stay: builder.query<Stay, string>({
      query: (id) => `/stays/${id}`,
      transformResponse: (response) => parse(staySchema, response),
      providesTags: (_result, _error, id) => [{ type: 'Stay', id }],
    }),
    createStay: builder.mutation<{ id: string }, CheckInRequest>({
      query: (body) => ({ url: '/stays', method: 'POST', body }),
      transformResponse: (response) =>
        parse(createStayResponseSchema, response),
      invalidatesTags: ['Camping', { type: 'Stays', id: 'LIST' }],
    }),
    quote: builder.mutation<StayQuote, { id: string; departureDate: string }>({
      query: ({ id, departureDate }) => ({
        url: `/stays/${id}/quote`,
        method: 'POST',
        body: { departureDate },
      }),
      transformResponse: (response) => parse(stayQuoteSchema, response),
    }),
    closeStay: builder.mutation<
      Stay,
      {
        id: string
        departureDate: string
        version: number
        payment?: PaymentInput
      }
    >({
      query: ({ id, departureDate, version, payment }) => ({
        url: `/stays/${id}/close`,
        method: 'POST',
        body: { departureDate, version, ...(payment ? { payment } : {}) },
      }),
      transformResponse: (response) => parse(staySchema, response),
      invalidatesTags: (_result, _error, arg) => [
        'Camping',
        { type: 'Stay', id: arg.id },
        { type: 'Stays', id: 'LIST' },
      ],
    }),
    addPayment: builder.mutation<Stay, { id: string; input: PaymentInput }>({
      query: ({ id, input }) => ({
        url: `/stays/${id}/payments`,
        method: 'POST',
        body: input,
      }),
      transformResponse: (response) => parse(staySchema, response),
      invalidatesTags: (_result, _error, arg) => [
        'Camping',
        { type: 'Stay', id: arg.id },
        { type: 'Stays', id: 'LIST' },
      ],
    }),
    extraTemplates: builder.query<ExtraTemplate[], void>({
      query: () => '/extra-templates',
      transformResponse: (response) =>
        parse(extraTemplateSchema.array(), response),
      providesTags: ['Templates'],
    }),
    createExtraTemplate: builder.mutation<ExtraTemplate, ExtraTemplateInput>({
      query: (body) => ({ url: '/extra-templates', method: 'POST', body }),
      transformResponse: (response) => parse(extraTemplateSchema, response),
      invalidatesTags: ['Templates'],
    }),
    updateExtraTemplate: builder.mutation<
      ExtraTemplate,
      { id: string; patch: ExtraTemplatePatch }
    >({
      query: ({ id, patch }) => ({
        url: `/extra-templates/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      transformResponse: (response) => parse(extraTemplateSchema, response),
      invalidatesTags: ['Templates'],
    }),
    addExtra: builder.mutation<Stay, { id: string; input: AddExtraInput }>({
      query: ({ id, input }) => ({
        url: `/stays/${id}/extras`,
        method: 'POST',
        body: input,
      }),
      transformResponse: (response) => parse(staySchema, response),
      invalidatesTags: (_result, _error, arg) => [
        'Camping',
        { type: 'Stay', id: arg.id },
        { type: 'Stays', id: 'LIST' },
      ],
    }),
    updateExtra: builder.mutation<
      Stay,
      {
        stayId: string
        extraId: string
        input: ExtraTemplateInput & { quantity: number }
      }
    >({
      query: ({ stayId, extraId, input }) => ({
        url: `/stays/${stayId}/extras/${extraId}`,
        method: 'PATCH',
        body: input,
      }),
      transformResponse: (response) => parse(staySchema, response),
      invalidatesTags: (_result, _error, arg) => [
        'Camping',
        { type: 'Stay', id: arg.stayId },
        { type: 'Stays', id: 'LIST' },
      ],
    }),
    deleteExtra: builder.mutation<Stay, { stayId: string; extraId: string }>({
      query: ({ stayId, extraId }) => ({
        url: `/stays/${stayId}/extras/${extraId}`,
        method: 'DELETE',
      }),
      transformResponse: (response) => parse(staySchema, response),
      invalidatesTags: (_result, _error, arg) => [
        'Camping',
        { type: 'Stay', id: arg.stayId },
        { type: 'Stays', id: 'LIST' },
      ],
    }),
    updateRates: builder.mutation<CampingProfile, RateInput>({
      query: (body) => ({ url: '/camping/rates', method: 'PATCH', body }),
      transformResponse: (response) => parse(campingProfileSchema, response),
      invalidatesTags: ['Camping'],
    }),
  }),
})

export const api = apiSlice
export const {
  useSessionQuery,
  useLoginMutation,
  useLogoutMutation,
  useCampingQuery,
  useStaysQuery,
  useStayQuery,
  useCreateStayMutation,
  useQuoteMutation,
  useCloseStayMutation,
  useAddPaymentMutation,
  useExtraTemplatesQuery,
  useCreateExtraTemplateMutation,
  useUpdateExtraTemplateMutation,
  useAddExtraMutation,
  useUpdateExtraMutation,
  useDeleteExtraMutation,
  useUpdateRatesMutation,
} = apiSlice
