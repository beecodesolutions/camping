import type {
  ReservationCreate,
  ReservationQuote,
  ReservationQuoteCreate,
} from '@camping/contracts'

export type CreationQuote = ReservationQuote & {
  input: ReservationQuoteCreate
  accommodationName: string
}
export type CreationState = {
  revision: number
  phase: 'editing' | 'quoting' | 'ready' | 'saving' | 'uncertain'
  quote: CreationQuote | null
  attempt: ReservationCreate | null
  error: string | null
}
export const initialCreationState: CreationState = {
  revision: 0,
  phase: 'editing',
  quote: null,
  attempt: null,
  error: null,
}
type Action =
  | { type: 'change' }
  | { type: 'quote-start' }
  | { type: 'quote-success'; revision: number; quote: CreationQuote }
  | { type: 'quote-error'; revision: number; error: string }
  | { type: 'save-start'; attempt: ReservationCreate }
  | { type: 'save-error'; uncertain: boolean; error: string }
  | { type: 'reset' }

export function creationReducer(
  state: CreationState,
  action: Action,
): CreationState {
  switch (action.type) {
    case 'change':
      return state.attempt
        ? state
        : { ...initialCreationState, revision: state.revision + 1 }
    case 'quote-start':
      return { ...state, phase: 'quoting', quote: null, error: null }
    case 'quote-success':
      return action.revision === state.revision
        ? { ...state, phase: 'ready', quote: action.quote, error: null }
        : state
    case 'quote-error':
      return action.revision === state.revision
        ? { ...state, phase: 'editing', error: action.error }
        : state
    case 'save-start':
      return { ...state, phase: 'saving', attempt: action.attempt, error: null }
    case 'save-error':
      return action.uncertain
        ? { ...state, phase: 'uncertain', error: action.error }
        : {
            ...initialCreationState,
            revision: state.revision + 1,
            error: action.error,
          }
    case 'reset':
      return { ...initialCreationState, revision: state.revision + 1 }
  }
}

export function reservationFailure(error: unknown): {
  uncertain: boolean
  message: string
} {
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? error.status
      : undefined
  const data =
    typeof error === 'object' && error !== null && 'data' in error
      ? error.data
      : undefined
  const code =
    typeof data === 'object' && data !== null && 'code' in data
      ? data.code
      : undefined
  if (status === 409)
    return {
      uncertain: false,
      message:
        code === 'PRICE_CHANGED'
          ? 'reservationCreate.priceChanged'
          : 'reservationCreate.unavailable',
    }
  if (typeof status === 'number' && status >= 400 && status < 500)
    return { uncertain: false, message: 'reservationCreate.invalidRequest' }
  return { uncertain: true, message: 'reservationCreate.uncertain' }
}
