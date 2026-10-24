import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { Users } from 'lucide-react'
import type { AccommodationType, CampingProfile } from '@camping/contracts'
import LucideIcon from './components/LucideIcon'
import AccommodationFilter from './AccommodationFilter'
import { useAppDispatch, useAppSelector } from './app/hooks'
import {
  accommodationFilterChanged,
  selectAccommodationFilter,
} from './app/accommodationFilterSlice'
import {
  useAccommodationTypesQuery,
  useAccommodationUnitsQuery,
  useLazyReservationsQuery,
  useLazyStaysQuery,
} from './services/api'
import { readAllPages } from './services/pagination'
import {
  summarizeOccupancy,
  type OccupancyMetrics,
  type OccupancySummary,
} from './services/individualOccupancy'

type LiveProps = { profile: CampingProfile }
type LegacyProps = Pick<
  CampingProfile,
  'activeGroups' | 'activePeople' | 'activeVehicles'
>
type Props = LiveProps | LegacyProps
type State =
  | { status: 'loading' }
  | { status: 'ready'; data: OccupancySummary }
  | { status: 'error' }

export default function OccupancyCard(props: Props) {
  if ('profile' in props) return <LiveOccupancyCard profile={props.profile} />
  return <LegacyOccupancyCard {...props} />
}

function LegacyOccupancyCard({
  activeGroups,
  activePeople,
  activeVehicles,
}: LegacyProps) {
  const { t } = useTranslation()
  return (
    <Paper
      component="section"
      aria-labelledby="occupancy-title"
      variant="outlined"
      sx={{ p: 2, borderRadius: 2, height: '100%' }}
    >
      <Stack spacing={2}>
        <Typography
          id="occupancy-title"
          component="h2"
          variant="subtitle1"
          sx={{ fontWeight: 700 }}
        >
          {t('home.occupancy')}
        </Typography>
        <Stack direction="row" spacing={2}>
          <Box>
            <Typography component="p" variant="h3">
              {activeGroups}
            </Typography>
            <Typography>{t('home.groups', { count: activeGroups })}</Typography>
          </Box>
          <Box>
            <Typography>{activePeople}</Typography>
            <Typography>{t('home.people', { count: activePeople })}</Typography>
            <Typography>{activeVehicles}</Typography>
            <Typography>
              {t('home.vehicles', { count: activeVehicles })}
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </Paper>
  )
}

function LiveOccupancyCard({ profile }: LiveProps) {
  const { t } = useTranslation()
  const types = useAccommodationTypesQuery()
  const units = useAccommodationUnitsQuery()
  const [readReservations] = useLazyReservationsQuery()
  const [readStays] = useLazyStaysQuery()
  const dispatch = useAppDispatch()
  const filter = useAppSelector(selectAccommodationFilter)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<State>({ status: 'loading' })
  const retry = useCallback(() => {
    setState({ status: 'loading' })
    void types.refetch()
    void units.refetch()
    setAttempt((value) => value + 1)
  }, [types, units])

  useEffect(() => {
    let active = true
    void Promise.all([
      readAllPages((page) =>
        readReservations({
          status: 'checked_in',
          page,
          pageSize: 100,
        }).unwrap(),
      ),
      readAllPages((page) =>
        readStays({ status: 'active', page, pageSize: 100 }).unwrap(),
      ),
    ])
      .then(([reservations, stays]) => {
        if (!active) return
        setState({
          status: 'ready',
          data: summarizeOccupancy(
            (types.data ?? []) as AccommodationType[],
            units.data ?? [],
            reservations,
            stays,
          ),
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
    profile.activeVehicles,
    profile.pendingAmountMinor,
    profile.timezone,
    readReservations,
    readStays,
    types.data,
    units.data,
  ])

  const selectedMetrics = useMemo<OccupancyMetrics | null>(() => {
    if (state.status !== 'ready') return null
    return state.data[filter]
  }, [filter, state])
  const loading =
    state.status === 'loading' || types.isLoading || units.isLoading
  const failed = state.status === 'error' || types.isError || units.isError

  return (
    <Paper
      component="section"
      aria-labelledby="occupancy-title"
      variant="outlined"
      sx={{ p: 2, borderRadius: 2, height: '100%' }}
    >
      <Stack spacing={2}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 1,
            width: '100%',
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <LucideIcon icon={Users} color="primary" aria-hidden="true" />
            <Typography
              id="occupancy-title"
              component="h2"
              variant="subtitle1"
              color="text.primary"
              sx={{ fontWeight: 700 }}
            >
              {t('home.occupancy')}
            </Typography>
          </Stack>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              flex: 1,
              minWidth: 0,
            }}
          >
            <AccommodationFilter
              value={filter}
              onChange={(value) => dispatch(accommodationFilterChanged(value))}
            />
          </Box>
        </Box>
        {loading ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <CircularProgress size={20} aria-label={t('common.loading')} />
            <Typography color="text.secondary">
              {t('home.occupancyLoading')}
            </Typography>
          </Stack>
        ) : failed ? (
          <Alert
            severity="error"
            action={<Button onClick={retry}>{t('common.retry')}</Button>}
          >
            {t('home.occupancyLoadError')}
          </Alert>
        ) : selectedMetrics ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                sm: 'minmax(0, 1.35fr) minmax(130px, 0.65fr)',
              },
              gap: { xs: 2, sm: 3 },
              alignItems: 'start',
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns:
                    filter !== 'camping' &&
                    state.status === 'ready' &&
                    state.data.individualUnits.total > 0
                      ? 'repeat(2, minmax(0, 1fr))'
                      : 'minmax(0, 1fr)',
                  gap: { xs: 1.5, sm: 2 },
                  alignItems: 'start',
                }}
              >
                <Metric
                  value={selectedMetrics.groups}
                  label={t('home.groups', { count: selectedMetrics.groups })}
                  primary
                />
                {filter !== 'camping' && state.status === 'ready' && (
                  <Box sx={{ minWidth: 0 }}>
                    {state.data.individualUnits.total === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        {t('home.individualOccupancyEmpty')}
                      </Typography>
                    ) : (
                      <UnitMetric
                        occupied={state.data.individualUnits.occupied}
                        total={state.data.individualUnits.total}
                      />
                    )}
                  </Box>
                )}
              </Box>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'max-content max-content max-content max-content',
                  sm: 'max-content max-content',
                },
                justifyContent: { xs: 'start', sm: 'end' },
                alignItems: 'center',
                columnGap: 1,
                rowGap: 0.5,
                '& .occupancy-count': {
                  color: 'accent.main',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  lineHeight: 1.2,
                  fontVariantNumeric: 'tabular-nums',
                  textAlign: 'right',
                },
              }}
            >
              <Typography className="occupancy-count">
                {selectedMetrics.people}
              </Typography>
              <Typography color="text.secondary">
                {t('home.people', { count: selectedMetrics.people })}
              </Typography>
              <Typography className="occupancy-count">
                {selectedMetrics.vehicles}
              </Typography>
              <Typography color="text.secondary">
                {t('home.vehicles', { count: selectedMetrics.vehicles })}
              </Typography>
            </Box>
          </Box>
        ) : null}
      </Stack>
    </Paper>
  )
}

function UnitMetric({ occupied, total }: { occupied: number; total: number }) {
  const { t } = useTranslation()
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        component="p"
        variant="h3"
        sx={{
          display: 'flex',
          alignItems: 'center',
          fontWeight: 650,
          color: 'primary.main',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {occupied}
        <Box
          component="span"
          sx={{ fontSize: '0.65em', mx: '0.12em', lineHeight: 1 }}
        >
          /
        </Box>
        {total}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        <Typography color="text.secondary">
          {t('home.individualOccupancyOccupiedLabel', { count: occupied })}
        </Typography>
      </Stack>
    </Box>
  )
}

function Metric({
  value,
  label,
  primary = false,
}: {
  value: number
  label: string
  primary?: boolean
}) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        component="p"
        variant={primary ? 'h3' : 'h5'}
        sx={{
          fontWeight: primary ? 650 : 700,
          color: primary ? 'primary.main' : 'accent.main',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
      <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
        {label}
      </Typography>
    </Box>
  )
}
