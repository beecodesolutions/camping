import { uiProps, uiStyles } from './app/theme'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import { Users } from 'lucide-react'
import type { AccommodationType, CampingProfile } from '@camping/contracts'
import LucideIcon from './components/LucideIcon'
import DashboardWidget from './components/DashboardWidget'
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
    <DashboardWidget
      titleId="occupancy-title"
      title={t('home.occupancy')}
      {...uiProps.fullHeightWidget}
    >
      <Stack {...uiProps.rowStandard}>
        <Box>
          <Typography component="p" variant="metric">
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
    </DashboardWidget>
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
    <DashboardWidget
      titleId="occupancy-title"
      title={
        <>
          <LucideIcon icon={Users} color="primary" aria-hidden="true" />
          {t('home.occupancy')}
        </>
      }
      action={
        <AccommodationFilter
          value={filter}
          onChange={(value) => dispatch(accommodationFilterChanged(value))}
        />
      }
      {...uiProps.fullHeightWidget}
    >
      {loading ? (
        <Stack {...uiProps.rowSmall} sx={uiStyles.alignCenter}>
          <CircularProgress
            {...uiProps.inlineProgress}
            aria-label={t('common.loading')}
          />
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
        <Box sx={uiStyles.liveOccupancyCardBox}>
          <Box sx={uiStyles.shrinkable}>
            <Box
              sx={uiStyles.occupancyMetricGrid(
                filter !== 'camping' &&
                  state.status === 'ready' &&
                  state.data.individualUnits.total > 0,
              )}
            >
              <Metric
                value={selectedMetrics.groups}
                label={t('home.groups', { count: selectedMetrics.groups })}
                primary
              />
              {filter !== 'camping' && state.status === 'ready' && (
                <Box sx={uiStyles.shrinkable}>
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
          <Box sx={uiStyles.liveOccupancyCardBox5}>
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
    </DashboardWidget>
  )
}

function UnitMetric({ occupied, total }: { occupied: number; total: number }) {
  const { t } = useTranslation()
  return (
    <Box sx={uiStyles.shrinkable}>
      <Typography
        component="p"
        variant="metric"
        sx={uiStyles.unitMetricTypography}
      >
        {occupied}
        <Box component="span" sx={uiStyles.unitMetricBox2}>
          /
        </Box>
        {total}
      </Typography>
      <Stack {...uiProps.rowSmall} sx={uiStyles.wrapRow}>
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
    <Box sx={uiStyles.shrinkable}>
      <Typography
        component="p"
        variant={primary ? 'metric' : 'metricSecondary'}
        sx={uiStyles.metricTypography(primary)}
      >
        {value}
      </Typography>
      <Typography color="text.secondary" sx={uiStyles.wrappedText}>
        {label}
      </Typography>
    </Box>
  )
}
