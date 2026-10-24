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
import { BedDouble } from 'lucide-react'
import type { AccommodationType, CampingProfile } from '@camping/contracts'
import LucideIcon from './components/LucideIcon'
import {
  useAccommodationTypesQuery,
  useAccommodationUnitsQuery,
  useLazyReservationsQuery,
  useLazyStaysQuery,
} from './services/api'
import { readAllPages } from './services/pagination'
import {
  summarizeIndividualOccupancy,
  type IndividualOccupancy,
} from './services/individualOccupancy'

type Props = { profile: CampingProfile }
type State =
  | { status: 'loading' }
  | { status: 'ready'; data: IndividualOccupancy }
  | { status: 'error' }

export default function UnitsOccupancyCard({ profile }: Props) {
  const { t } = useTranslation()
  const types = useAccommodationTypesQuery()
  const units = useAccommodationUnitsQuery()
  const [readReservations] = useLazyReservationsQuery()
  const [readStays] = useLazyStaysQuery()
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
          data: summarizeIndividualOccupancy(
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

  const title = useMemo(() => {
    const individualTypes = (types.data ?? []).filter(
      (type) => type.enabled && type.inventoryMode === 'individual',
    )
    return individualTypes.length === 1
      ? individualTypes[0]!.name
      : t('home.individualOccupancyTitle')
  }, [t, types.data])
  const loading =
    state.status === 'loading' || types.isLoading || units.isLoading
  const failed = state.status === 'error' || types.isError || units.isError

  return (
    <Paper
      component="section"
      aria-labelledby="individual-occupancy-title"
      variant="outlined"
      sx={{ p: 2, borderRadius: 2, height: '100%' }}
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <LucideIcon icon={BedDouble} color="primary" aria-hidden="true" />
          <Typography
            id="individual-occupancy-title"
            component="h2"
            variant="subtitle1"
            sx={{ fontWeight: 700 }}
          >
            {title}
          </Typography>
        </Stack>
        {loading ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <CircularProgress size={20} aria-label={t('common.loading')} />
            <Typography color="text.secondary">
              {t('home.individualOccupancyLoading')}
            </Typography>
          </Stack>
        ) : failed ? (
          <Alert
            severity="error"
            action={<Button onClick={retry}>{t('common.retry')}</Button>}
          >
            {t('home.individualOccupancyError')}
          </Alert>
        ) : state.status === 'ready' && state.data.total > 0 ? (
          <Box>
            <Typography
              component="p"
              variant="h3"
              sx={{ fontWeight: 650, color: 'primary.main' }}
            >
              {state.data.occupied} / {state.data.total}
            </Typography>
            <Typography color="text.secondary">
              {t('home.individualOccupancyOccupiedLabel', {
                count: state.data.occupied,
              })}
            </Typography>
            <Typography color="text.secondary">
              {t('home.individualOccupancyUnoccupied', {
                count: state.data.unoccupied,
              })}
            </Typography>
          </Box>
        ) : (
          <Typography color="text.secondary">
            {t('home.individualOccupancyEmpty')}
          </Typography>
        )}
      </Stack>
    </Paper>
  )
}
