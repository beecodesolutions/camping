import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import type {
  AccommodationType,
  CampingProfile,
  ReservationResponse,
  Stay,
} from '@camping/contracts'
import { todayInTimezone } from '@camping/contracts'
import {
  useAccommodationTypesQuery,
  useAccommodationUnitsQuery,
  useLazyReservationsQuery,
  useLazyStaysQuery,
} from './services/api'
import { addDays, typeNameById } from './services/calendar'

type DashboardProps = { profile: CampingProfile }
type DashboardState = {
  arrivals: ReservationResponse[]
  stays: Stay[]
  checkedInReservations: ReservationResponse[]
}
type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: DashboardState }
  | { status: 'error' }
type Page<T> = { items: T[]; total: number; pageSize: number }
type DepartureItem = Pick<
  Stay,
  | 'id'
  | 'responsibleName'
  | 'location'
  | 'adults'
  | 'children'
  | 'infants'
  | 'estimatedDeparture'
>

function formatDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`))
}

function guestCount(reservation: ReservationResponse) {
  return reservation.adults + reservation.children + reservation.infants
}

async function allPages<T>(
  readPage: (page: number) => Promise<Page<T>>,
): Promise<T[]> {
  const first = await readPage(1)
  const pages = Math.ceil(first.total / first.pageSize)
  const items = [...first.items]
  for (let page = 2; page <= pages; page += 1) {
    const next = await readPage(page)
    items.push(...next.items)
  }
  return items
}

function useTodayData(
  profile: CampingProfile,
): LoadState & { retry: () => void } {
  const [readReservations] = useLazyReservationsQuery()
  const [readStays] = useLazyStaysQuery()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((value) => value + 1)
  }, [])

  useEffect(() => {
    let active = true
    const today = todayInTimezone(profile.timezone)
    const tomorrow = addDays(today, 1)
    void Promise.all([
      allPages((page) =>
        readReservations({
          status: 'pending',
          checkInDate: today,
          checkOutDate: tomorrow,
          page,
          pageSize: 100,
        }).unwrap(),
      ),
      allPages((page) =>
        readReservations({
          status: 'confirmed',
          checkInDate: today,
          checkOutDate: tomorrow,
          page,
          pageSize: 100,
        }).unwrap(),
      ),
      allPages((page) =>
        readReservations({
          status: 'checked_in',
          page,
          pageSize: 100,
        }).unwrap(),
      ),
      allPages((page) =>
        readStays({ status: 'active', page, pageSize: 100 }).unwrap(),
      ),
    ])
      .then(([pending, confirmed, checkedInReservations, stays]) => {
        if (!active) return
        setState({
          status: 'ready',
          data: {
            arrivals: [...pending, ...confirmed]
              .filter((reservation) => reservation.checkInDate === today)
              .sort((left, right) =>
                left.responsibleName.localeCompare(right.responsibleName),
              ),
            stays,
            checkedInReservations,
          },
        })
      })
      .catch(() => {
        if (active) setState({ status: 'error' })
      })
    return () => {
      active = false
    }
  }, [
    attempt,
    profile.activeGroups,
    profile.activePeople,
    profile.pendingAmountMinor,
    profile.timezone,
    readReservations,
    readStays,
  ])

  return { ...state, retry }
}

function ReservationRow({
  reservation,
  typeNames,
  unitNames,
  language,
}: {
  reservation: ReservationResponse
  typeNames: Map<string, string>
  unitNames: Map<string, string>
  language: string
}) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontWeight: 700 }} noWrap>
          {reservation.responsibleName}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {typeNames.get(reservation.accommodationTypeId) ?? 'Alojamiento'} ·{' '}
          {reservation.unitId
            ? (unitNames.get(reservation.unitId) ?? 'Unidad sin nombre')
            : 'Camping libre'}{' '}
          · {guestCount(reservation)}{' '}
          {guestCount(reservation) === 1 ? 'persona' : 'personas'}
        </Typography>
      </Box>
      <Chip
        size="small"
        label={reservation.status === 'pending' ? 'Pendiente' : 'Confirmada'}
        color={reservation.status === 'pending' ? 'warning' : 'success'}
      />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: { xs: 'none', sm: 'block' } }}
      >
        {formatDate(reservation.checkOutDate, language)}
      </Typography>
    </Stack>
  )
}

function DepartureRow({
  stay,
  language,
  overdue,
}: {
  stay: DepartureItem
  language: string
  overdue: boolean
}) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontWeight: 700 }} noWrap>
          {stay.responsibleName}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {stay.location || 'Sin ubicación'} ·{' '}
          {stay.adults + stay.children + stay.infants}{' '}
          {stay.adults + stay.children + stay.infants === 1
            ? 'persona'
            : 'personas'}
        </Typography>
      </Box>
      <Chip
        size="small"
        label={overdue ? 'Atrasada' : 'Hoy'}
        color={overdue ? 'error' : 'warning'}
      />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: { xs: 'none', sm: 'block' } }}
      >
        {formatDate(stay.estimatedDeparture, language)}
      </Typography>
    </Stack>
  )
}

export default function DashboardToday({ profile }: DashboardProps) {
  const { t, i18n } = useTranslation()
  const query = useTodayData(profile)
  const types = useAccommodationTypesQuery()
  const units = useAccommodationUnitsQuery()
  const typeNames = useMemo(
    () => typeNameById((types.data ?? []) as AccommodationType[]),
    [types.data],
  )
  const unitNames = useMemo(
    () => new Map((units.data ?? []).map((unit) => [unit.id, unit.name])),
    [units.data],
  )
  const today = todayInTimezone(profile.timezone)
  const dashboard = query.status === 'ready' ? query.data : null
  const linkedReservationIds = useMemo(
    () =>
      new Set(
        (dashboard?.stays ?? [])
          .map((stay) => stay.reservationId)
          .filter(Boolean),
      ),
    [dashboard?.stays],
  )
  const departures = useMemo(() => {
    if (!dashboard) return { today: [], overdue: [] }
    const todayStays = dashboard.stays.filter(
      (stay) => stay.estimatedDeparture === today,
    )
    const overdueStays = dashboard.stays.filter(
      (stay) =>
        Boolean(stay.estimatedDeparture) && stay.estimatedDeparture < today,
    )
    const unlinkedReservations: DepartureItem[] =
      dashboard.checkedInReservations
        .filter((reservation) => !linkedReservationIds.has(reservation.id))
        .map((reservation) => ({
          id: reservation.id,
          responsibleName: reservation.responsibleName,
          location: '',
          adults: reservation.adults,
          children: reservation.children,
          infants: reservation.infants,
          estimatedDeparture: reservation.checkOutDate,
        }))
    return {
      today: [
        ...todayStays,
        ...unlinkedReservations.filter(
          (item) => item.estimatedDeparture === today,
        ),
      ],
      overdue: [
        ...overdueStays,
        ...unlinkedReservations.filter(
          (item) => item.estimatedDeparture < today,
        ),
      ],
    }
  }, [dashboard, linkedReservationIds, today])

  if (query.status === 'loading')
    return <Typography color="text.secondary">{t('home.loading')}</Typography>
  if (query.status === 'error')
    return (
      <Alert
        severity="error"
        action={<Button onClick={query.retry}>{t('common.retry')}</Button>}
      >
        {t('home.todayLoadError')}
      </Alert>
    )
  if (!dashboard) return null

  return (
    <Stack spacing={2}>
      <Paper
        component="section"
        variant="outlined"
        sx={{ p: 2, borderRadius: 2 }}
      >
        <Typography component="h2" variant="h6" sx={{ fontWeight: 700 }}>
          {t('home.todayTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {formatDate(today, i18n.language)} · {profile.timezone}
        </Typography>
        <Stack spacing={1.5} divider={<Divider flexItem />}>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t('home.expectedArrivals')}
            </Typography>
            {dashboard.arrivals.length ? (
              <Stack spacing={1.25}>
                {dashboard.arrivals.map((reservation) => (
                  <ReservationRow
                    key={reservation.id}
                    reservation={reservation}
                    typeNames={typeNames}
                    unitNames={unitNames}
                    language={i18n.language}
                  />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('home.noArrivals')}
              </Typography>
            )}
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t('home.expectedDepartures')}
            </Typography>
            {departures.today.length ? (
              <Stack spacing={1.25}>
                {departures.today.map((stay) => (
                  <DepartureRow
                    key={stay.id}
                    stay={stay}
                    language={i18n.language}
                    overdue={false}
                  />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('home.noDepartures')}
              </Typography>
            )}
          </Box>
          {departures.overdue.length > 0 && (
            <Box>
              <Typography variant="subtitle2" color="error.main" sx={{ mb: 1 }}>
                {t('home.overdueDepartures')}
              </Typography>
              <Stack spacing={1.25}>
                {departures.overdue.map((stay) => (
                  <DepartureRow
                    key={stay.id}
                    stay={stay}
                    language={i18n.language}
                    overdue
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </Paper>
    </Stack>
  )
}
