import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { LogIn, LogOut } from 'lucide-react'
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
import AccommodationIdentity from './AccommodationIdentity'
import {
  buildAccommodationIdentity,
  indexReservationsById,
} from './services/accommodationIdentity'
import StayList, { type StaySelection } from './StayList'
import ReservationCheckInDialog from './ReservationCheckInDialog'
import LucideIcon from './components/LucideIcon'

type DashboardProps = {
  profile: CampingProfile
  onSelect: (selection: StaySelection) => void
  refreshKey?: number
}
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
  | 'reservationId'
> & { reservation?: ReservationResponse; canCheckOut?: boolean }

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
  refreshKey: number,
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
              .filter(
                (reservation) =>
                  reservation.checkInDate === today &&
                  reservation.status === 'confirmed',
              )
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
    refreshKey,
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
  typeModes,
  unitNames,
  language,
  onCheckIn,
}: {
  reservation: ReservationResponse
  typeNames: Map<string, string>
  typeModes: Map<string, string>
  unitNames: Map<string, string>
  language: string
  onCheckIn: () => void
}) {
  const { t } = useTranslation()
  const identity = buildAccommodationIdentity({
    reservation,
    typeNames,
    typeModes,
    unitNames,
    labels: {
      accommodation: t('home.accommodation'),
      freeCamping: t('home.freeCamping'),
      unknownUnit: t('home.unknownUnit'),
    },
  })
  return (
    <ListItem
      disableGutters
      divider
      sx={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: 1,
        py: 1.25,
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
          {reservation.responsibleName}
        </Typography>
        <AccommodationIdentity
          identity={identity}
          compactMobile
          people={guestCount(reservation)}
        />
      </Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}
      >
        <Tooltip title={t('home.checkInAction')}>
          <IconButton
            aria-label={t('home.checkInAction')}
            onClick={onCheckIn}
            sx={{
              width: 44,
              height: 44,
              bgcolor: 'success.main',
              color: 'success.contrastText',
              '&:hover': { bgcolor: 'success.dark' },
            }}
          >
            <LucideIcon icon={LogIn} />
          </IconButton>
        </Tooltip>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: { xs: 'none', sm: 'block' } }}
        >
          {formatDate(reservation.checkOutDate, language)}
        </Typography>
      </Stack>
    </ListItem>
  )
}

function DepartureRow({
  stay,
  typeNames,
  typeModes,
  unitNames,
  language,
  onCheckOut,
}: {
  stay: DepartureItem
  typeNames: Map<string, string>
  typeModes: Map<string, string>
  unitNames: Map<string, string>
  language: string
  onCheckOut: () => void
}) {
  const { t } = useTranslation()
  const identity = buildAccommodationIdentity({
    reservation: stay.reservation,
    hasReservation: Boolean(stay.reservationId || stay.reservation),
    location: stay.location,
    typeNames,
    typeModes,
    unitNames,
    labels: {
      accommodation: t('home.accommodation'),
      freeCamping: t('home.freeCamping'),
      unknownUnit: t('home.unknownUnit'),
    },
  })
  return (
    <ListItem
      disableGutters
      divider
      sx={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: 1,
        py: 1.25,
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
          {stay.responsibleName}
        </Typography>
        <AccommodationIdentity
          identity={identity}
          compactMobile
          people={stay.adults + stay.children + stay.infants}
        />
      </Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}
      >
        {stay.canCheckOut && (
          <Tooltip title={t('home.checkOutAction')}>
            <IconButton
              aria-label={t('home.checkOutAction')}
              onClick={onCheckOut}
              sx={(theme) => {
                const palette = theme.palette.warning
                const background =
                  theme.palette.mode === 'dark' ? palette.light : palette.dark
                return {
                  width: 44,
                  height: 44,
                  bgcolor: background,
                  color: theme.palette.getContrastText(background),
                  '&:hover': { bgcolor: palette.main },
                }
              }}
            >
              <LucideIcon icon={LogOut} />
            </IconButton>
          </Tooltip>
        )}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: { xs: 'none', sm: 'block' } }}
        >
          {formatDate(stay.estimatedDeparture, language)}
        </Typography>
      </Stack>
    </ListItem>
  )
}

export default function DashboardToday({
  profile,
  onSelect,
  refreshKey = 0,
}: DashboardProps) {
  const { t, i18n } = useTranslation()
  const query = useTodayData(profile, refreshKey)
  const [checkInReservation, setCheckInReservation] =
    useState<ReservationResponse | null>(null)
  const dashboard = query.status === 'ready' ? query.data : null
  const types = useAccommodationTypesQuery()
  const units = useAccommodationUnitsQuery()
  const typeNames = useMemo(
    () => typeNameById((types.data ?? []) as AccommodationType[]),
    [types.data],
  )
  const typeModes = useMemo(
    () =>
      new Map((types.data ?? []).map((type) => [type.id, type.inventoryMode])),
    [types.data],
  )
  const unitNames = useMemo(
    () => new Map((units.data ?? []).map((unit) => [unit.id, unit.name])),
    [units.data],
  )
  const reservationsById = useMemo(
    () => indexReservationsById(dashboard?.checkedInReservations ?? []),
    [dashboard?.checkedInReservations],
  )
  const today = todayInTimezone(profile.timezone)
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
          id: reservation.stayId ?? reservation.id,
          reservationId: null,
          responsibleName: reservation.responsibleName,
          location: '',
          adults: reservation.adults,
          children: reservation.children,
          infants: reservation.infants,
          estimatedDeparture: reservation.checkOutDate,
          reservation,
          canCheckOut: Boolean(reservation.stayId),
        }))
    const withReservations = (items: Stay[]) =>
      items.map((stay) => ({
        ...stay,
        canCheckOut: true,
        reservation: stay.reservationId
          ? reservationsById.get(stay.reservationId)
          : undefined,
      }))
    return {
      today: [
        ...withReservations(todayStays),
        ...unlinkedReservations.filter(
          (item) => item.estimatedDeparture === today,
        ),
      ],
      overdue: [
        ...withReservations(overdueStays),
        ...unlinkedReservations.filter(
          (item) => item.estimatedDeparture < today,
        ),
      ],
    }
  }, [dashboard, linkedReservationIds, reservationsById, today])

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
        <Stack spacing={3}>
          <Box>
            <Typography
              component="h3"
              variant="subtitle1"
              sx={(theme) => ({
                mb: 0.5,
                fontWeight: 700,
                color:
                  theme.palette.mode === 'dark'
                    ? 'success.light'
                    : 'success.dark',
              })}
            >
              {t('home.expectedArrivals')}
            </Typography>
            {dashboard.arrivals.length ? (
              <List disablePadding>
                {dashboard.arrivals.map((reservation) => (
                  <ReservationRow
                    key={reservation.id}
                    reservation={reservation}
                    typeNames={typeNames}
                    typeModes={typeModes}
                    unitNames={unitNames}
                    language={i18n.language}
                    onCheckIn={() => setCheckInReservation(reservation)}
                  />
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('home.noArrivals')}
              </Typography>
            )}
          </Box>
          <Box>
            <Typography
              component="h3"
              variant="subtitle1"
              sx={(theme) => ({
                mb: 0.5,
                fontWeight: 700,
                color:
                  theme.palette.mode === 'dark'
                    ? 'warning.light'
                    : 'warning.dark',
              })}
            >
              {t('home.expectedDepartures')}
            </Typography>
            {departures.today.length ? (
              <List disablePadding>
                {departures.today.map((stay) => (
                  <DepartureRow
                    key={stay.id}
                    stay={stay}
                    typeNames={typeNames}
                    typeModes={typeModes}
                    unitNames={unitNames}
                    language={i18n.language}
                    onCheckOut={() =>
                      onSelect({ id: stay.id, action: 'close' })
                    }
                  />
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('home.noDepartures')}
              </Typography>
            )}
          </Box>
          {departures.overdue.length > 0 && (
            <Box>
              <Typography
                component="h3"
                variant="subtitle1"
                sx={(theme) => ({
                  mb: 0.5,
                  fontWeight: 700,
                  color:
                    theme.palette.mode === 'dark'
                      ? 'error.light'
                      : 'error.dark',
                })}
              >
                {t('home.overdueDepartures')}
              </Typography>
              <List disablePadding>
                {departures.overdue.map((stay) => (
                  <DepartureRow
                    key={stay.id}
                    stay={stay}
                    typeNames={typeNames}
                    typeModes={typeModes}
                    unitNames={unitNames}
                    language={i18n.language}
                    onCheckOut={() =>
                      onSelect({ id: stay.id, action: 'close' })
                    }
                  />
                ))}
              </List>
            </Box>
          )}
        </Stack>
      </Paper>
      {checkInReservation && (
        <ReservationCheckInDialog
          reservation={checkInReservation}
          timezone={profile.timezone}
          onClose={() => setCheckInReservation(null)}
          onSuccess={() => {
            setCheckInReservation(null)
            query.retry()
          }}
        />
      )}
      <Paper
        component="section"
        aria-labelledby="active-stays-title"
        variant="outlined"
        sx={{ p: 2, borderRadius: 2 }}
      >
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            mb: 1,
          }}
        >
          <Typography
            id="active-stays-title"
            component="h2"
            variant="h6"
            sx={{ fontWeight: 700 }}
          >
            {t('home.activeStays')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {dashboard.stays.length}
          </Typography>
        </Stack>
        <StayList
          items={dashboard.stays}
          timezone={profile.timezone}
          onSelect={onSelect}
          typeNames={typeNames}
          typeModes={typeModes}
          unitNames={unitNames}
          reservationsById={reservationsById}
        />
      </Paper>
    </Stack>
  )
}
