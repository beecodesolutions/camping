import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { alpha, type Theme } from '@mui/material/styles'
import LucideIcon from './components/LucideIcon'
import AccommodationIdentity from './AccommodationIdentity'
import { buildAccommodationIdentity } from './services/accommodationIdentity'
import type {
  AccommodationType,
  CampingProfile,
  ReservationResponse,
} from '@camping/contracts'
import { todayInTimezone } from '@camping/contracts'
import {
  useAccommodationTypesQuery,
  useAccommodationUnitsQuery,
  useAvailabilityQuery,
  useLazyReservationsQuery,
} from './services/api'
import {
  addDays,
  availabilityForDate,
  dateFromIso,
  monthKey,
  monthRange,
  shiftMonth,
  typeNameById,
  type AvailabilitySummary,
} from './services/calendar'

type Props = { profile: CampingProfile }
type SelectedDay = { date: string; typeId: string } | null

function monthLabel(value: string, language: string) {
  return new Intl.DateTimeFormat(language, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dateFromIso(`${value}-01`))
}

function toneColor(tone: AvailabilitySummary['tone'], theme: Theme) {
  const dark = theme.palette.mode === 'dark'
  if (tone === 'free')
    return {
      backgroundColor: alpha(theme.palette.primary.main, dark ? 0.16 : 0.1),
      color: dark ? theme.palette.primary.light : theme.palette.primary.dark,
    }
  if (tone === 'partial')
    return {
      backgroundColor: alpha(theme.palette.secondary.main, dark ? 0.22 : 0.2),
      color: dark ? theme.palette.secondary.main : theme.palette.secondary.dark,
    }
  if (tone === 'none')
    return {
      backgroundColor: alpha(theme.palette.accent.main, dark ? 0.18 : 0.1),
      color: theme.palette.accent.main,
    }
  return {
    backgroundColor: theme.palette.action.hover,
    color: theme.palette.text.secondary,
  }
}

type Translate = ReturnType<typeof useTranslation>['t']

function statusLabel(summary: AvailabilitySummary | null, t: Translate) {
  if (!summary) return t('calendar.noData')
  if (summary.tone === 'free') return t('calendar.free')
  if (summary.tone === 'partial') return t('calendar.partial')
  if (summary.tone === 'none') return t('calendar.none')
  return t('calendar.unlimited')
}

function AvailabilityGrid({
  type,
  nights,
  cells,
  today,
  selectedDate,
  language,
  onDay,
}: {
  type: AccommodationType
  nights: Parameters<typeof availabilityForDate>[0]
  cells: ReturnType<typeof monthRange>['days']
  today: string
  selectedDate?: string
  language: string
  onDay: (date: string, typeId: string) => void
}) {
  const { t } = useTranslation()
  const theme = useTheme()
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(language, { weekday: 'short' }).format(
      new Date(Date.UTC(2024, 0, 7 + index, 12)),
    ),
  )
  return (
    <Paper
      component="section"
      variant="outlined"
      sx={{ p: 1.5, borderRadius: 2 }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: 0.5,
        }}
      >
        {weekdays.map((weekday) => (
          <Typography
            key={weekday}
            variant="caption"
            color="text.secondary"
            sx={{ textAlign: 'center', textTransform: 'capitalize', py: 0.5 }}
          >
            {weekday}
          </Typography>
        ))}
        {cells.map((cell) => {
          const summary = availabilityForDate(nights, cell.date)
          const colors = summary ? toneColor(summary.tone, theme) : undefined
          const isToday = cell.date === today
          const isSelected = cell.date === selectedDate
          return (
            <Button
              key={cell.date}
              variant="text"
              aria-label={`${cell.date}${isToday ? `, ${t('calendar.today')}` : ''}: ${statusLabel(summary, t)}`}
              aria-current={isToday ? 'date' : undefined}
              aria-pressed={isSelected}
              onClick={() => cell.inMonth && onDay(cell.date, type.id)}
              disabled={!cell.inMonth || !summary}
              sx={{
                position: 'relative',
                minWidth: 0,
                minHeight: 44,
                p: 0.5,
                borderRadius: 1.25,
                color: cell.inMonth ? colors?.color : 'text.disabled',
                backgroundColor: cell.inMonth
                  ? colors?.backgroundColor
                  : 'transparent',
                border: '3px solid transparent',
                borderColor: isSelected ? 'selection.main' : 'transparent',
                boxShadow: 'none',
                '&:focus-visible': {
                  outline: `2px solid ${theme.palette.selection.main}`,
                  outlineOffset: 2,
                },
                '&:hover': {
                  backgroundColor: cell.inMonth
                    ? colors?.backgroundColor
                    : undefined,
                  filter: 'brightness(0.97)',
                },
                '&.Mui-disabled': {
                  color: cell.inMonth ? colors?.color : 'text.disabled',
                  backgroundColor: cell.inMonth
                    ? colors?.backgroundColor
                    : 'transparent',
                  opacity: cell.inMonth ? 0.86 : 0.5,
                },
              }}
            >
              <Typography
                variant="body2"
                component="span"
                sx={{
                  fontWeight: isToday || isSelected ? 800 : 600,
                  display: 'grid',
                  placeItems: 'center',
                  width: 24,
                  height: 24,
                }}
              >
                {cell.day}
              </Typography>
              {isToday && (
                <Box
                  component="span"
                  aria-hidden="true"
                  sx={{
                    position: 'absolute',
                    top: 4,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    bgcolor: 'selection.main',
                  }}
                />
              )}
            </Button>
          )
        })}
      </Box>
    </Paper>
  )
}

function DayDetail({
  selected,
  summary,
  type,
  typeNames,
  typeModes,
  unitNames,
}: {
  selected: SelectedDay
  summary: AvailabilitySummary | null
  type: AccommodationType | undefined
  typeNames: Map<string, string>
  typeModes: Map<string, string>
  unitNames: Map<string, string>
}) {
  const { t, i18n } = useTranslation()
  const [readReservations] = useLazyReservationsQuery()
  const [reservationState, setReservationState] = useState<{
    status: 'idle' | 'loading' | 'ready' | 'error'
    items: ReservationResponse[]
  }>({ status: 'loading', items: [] })
  const selectedDate = selected?.date
  const selectedTypeId = selected?.typeId
  useEffect(() => {
    if (!selectedDate || !selectedTypeId) return
    let active = true
    void (async () => {
      try {
        const items: ReservationResponse[] = []
        const statuses = new Set(['pending', 'confirmed', 'checked_in'])
        let page = 1
        let total = 0
        do {
          const result = await readReservations({
            typeId: selectedTypeId,
            checkInDate: selectedDate,
            checkOutDate: addDays(selectedDate, 1),
            page,
            pageSize: 100,
          }).unwrap()
          total = result.total
          items.push(
            ...result.items.filter((item) => statuses.has(item.status)),
          )
          page += 1
        } while ((page - 1) * 100 < total)
        if (active) setReservationState({ status: 'ready', items })
      } catch {
        if (active) setReservationState({ status: 'error', items: [] })
      }
    })()
    return () => {
      active = false
    }
  }, [readReservations, selectedDate, selectedTypeId])
  if (!selected || !type) return null
  const currentReservations = reservationState.items
  return (
    <Paper
      component="section"
      aria-labelledby="calendar-day-detail-title"
      variant="outlined"
      sx={{ p: 1.5, borderRadius: 2 }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Box>
          <Typography
            id="calendar-day-detail-title"
            component="h3"
            variant="subtitle1"
            sx={{ fontWeight: 700 }}
          >
            {new Intl.DateTimeFormat(i18n.language, {
              dateStyle: 'full',
              timeZone: 'UTC',
            }).format(new Date(`${selected.date}T12:00:00Z`))}
          </Typography>
        </Box>
      </Stack>
      <Box sx={{ mt: 1.5 }}>
        {!summary ? (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {t('common.loading')}
          </Typography>
        ) : summary.tone === 'unlimited' ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('calendar.unlimitedReservations', { count: summary.reserved })}
          </Typography>
        ) : (
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 2 }}>
            <Chip
              label={t('calendar.freeCount', {
                count: summary?.available ?? 0,
              })}
              color="success"
              size="small"
            />
            <Chip
              label={t('calendar.occupiedCount', {
                count: summary?.reserved ?? 0,
              })}
              color="warning"
              size="small"
            />
            <Chip
              label={t('calendar.blockedCount', {
                count: summary?.blocked ?? 0,
              })}
              color="error"
              size="small"
            />
          </Stack>
        )}
        {reservationState.status === 'loading' && (
          <Typography color="text.secondary">{t('common.loading')}</Typography>
        )}
        {reservationState.status === 'error' && (
          <Alert severity="error">{t('calendar.detailError')}</Alert>
        )}
        {reservationState.status === 'ready' &&
          currentReservations.length === 0 && (
            <Typography color="text.secondary">
              {t('calendar.noReservations')}
            </Typography>
          )}
        <Stack spacing={1.5}>
          {currentReservations.map((reservation) => (
            <Box
              key={reservation.id}
              sx={{ borderTop: 1, borderColor: 'divider', pt: 1 }}
            >
              <Stack
                direction="row"
                sx={{ justifyContent: 'space-between', gap: 1 }}
              >
                <Typography sx={{ fontWeight: 700 }}>
                  {reservation.responsibleName}
                </Typography>
                <Chip
                  size="small"
                  label={t(`calendar.status.${reservation.status}`)}
                />
              </Stack>
              <AccommodationIdentity
                identity={buildAccommodationIdentity({
                  reservation,
                  typeNames,
                  typeModes,
                  unitNames,
                  labels: {
                    accommodation: t('home.accommodation'),
                    freeCamping: t('home.freeCamping'),
                    unknownUnit: t('home.unknownUnit'),
                  },
                })}
                people={
                  reservation.adults +
                  reservation.children +
                  reservation.infants
                }
              />
              <Typography variant="caption" color="text.secondary">
                {reservation.checkInDate} → {reservation.checkOutDate}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    </Paper>
  )
}

export default function AvailabilityCalendar({ profile }: Props) {
  const { t, i18n } = useTranslation()
  const today = todayInTimezone(profile.timezone)
  const [month, setMonth] = useState(monthKey(today))
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedDay, setSelectedDay] = useState<SelectedDay>(null)
  const range = useMemo(() => monthRange(month), [month])
  const types = useAccommodationTypesQuery()
  const units = useAccommodationUnitsQuery()
  const enabledTypes = useMemo(
    () => (types.data ?? []).filter((type) => type.enabled),
    [types.data],
  )
  const preferredType = useMemo(
    () =>
      enabledTypes.find((type) => type.inventoryMode === 'individual') ??
      enabledTypes[0],
    [enabledTypes],
  )
  const activeTypeId =
    enabledTypes.find((type) => type.id === selectedType)?.id ??
    preferredType?.id ??
    ''
  const availability = useAvailabilityQuery(
    {
      checkInDate: range.start,
      checkOutDate: range.end,
      ...(activeTypeId ? { typeId: activeTypeId } : {}),
    },
    { skip: enabledTypes.length === 0 },
  )
  const displayedType = enabledTypes.find((type) => type.id === activeTypeId)
  const unitNames = useMemo(
    () => new Map((units.data ?? []).map((unit) => [unit.id, unit.name])),
    [units.data],
  )
  const typeNames = useMemo(() => typeNameById(types.data ?? []), [types.data])
  const typeModes = useMemo(
    () =>
      new Map((types.data ?? []).map((type) => [type.id, type.inventoryMode])),
    [types.data],
  )
  const selectedTypeData = availability.currentData?.types ?? []
  const selectedAccommodationType = enabledTypes.find(
    (type) => type.id === selectedDay?.typeId,
  )
  const visibleSelectedDay =
    activeTypeId &&
    selectedAccommodationType?.id === activeTypeId &&
    selectedDay?.date.startsWith(month)
      ? selectedDay
      : activeTypeId
        ? {
            date: month === monthKey(today) ? today : range.start,
            typeId: activeTypeId,
          }
        : null
  const visibleSummary = visibleSelectedDay
    ? availabilityForDate(
        selectedTypeData.find(
          (item) => item.typeId === visibleSelectedDay.typeId,
        ),
        visibleSelectedDay.date,
      )
    : null
  const visibleAccommodationType = enabledTypes.find(
    (type) => type.id === visibleSelectedDay?.typeId,
  )

  return (
    <Stack spacing={1.5}>
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: { xs: 'center', sm: 'flex-start' },
          maxWidth: '100%',
        }}
      >
        <IconButton
          aria-label={t('common.previous')}
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          <LucideIcon icon={ChevronLeft} />
        </IconButton>
        <Typography
          sx={{
            minWidth: { xs: 100, sm: 130 },
            flex: '1 1 100px',
            textAlign: 'center',
            fontWeight: 700,
            textTransform: 'capitalize',
          }}
        >
          {monthLabel(month, i18n.language)}
        </Typography>
        <IconButton
          aria-label={t('common.next')}
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          <LucideIcon icon={ChevronRight} />
        </IconButton>
        <Button size="small" onClick={() => setMonth(monthKey(today))}>
          {t('calendar.today')}
        </Button>
      </Stack>
      {enabledTypes.length > 0 && (
        <ToggleButtonGroup
          value={activeTypeId}
          exclusive
          onChange={(_, value: string | null) =>
            value && setSelectedType(value)
          }
          aria-label={t('calendar.typeFilter')}
          size="small"
          sx={{ flexWrap: 'wrap' }}
        >
          {enabledTypes.map((type) => (
            <ToggleButton key={type.id} value={type.id}>
              {type.name}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}
      {types.isLoading || availability.isLoading ? (
        <Typography color="text.secondary">{t('common.loading')}</Typography>
      ) : null}
      {(types.isError || availability.isError) && (
        <Alert
          severity="error"
          action={
            <Button
              onClick={() => {
                void types.refetch()
                void availability.refetch()
              }}
            >
              {t('common.retry')}
            </Button>
          }
        >
          {t('calendar.loadError')}
        </Alert>
      )}
      {!types.isLoading && enabledTypes.length === 0 && (
        <Alert severity="info">{t('calendar.empty')}</Alert>
      )}
      {availability.currentData &&
        availability.currentData.checkInDate === range.start &&
        availability.currentData.checkOutDate === range.end &&
        displayedType && (
          <AvailabilityGrid
            type={displayedType}
            nights={selectedTypeData.find(
              (item) => item.typeId === displayedType.id,
            )}
            cells={range.days}
            today={today}
            selectedDate={
              visibleSelectedDay?.typeId === displayedType.id
                ? visibleSelectedDay.date
                : undefined
            }
            language={i18n.language}
            onDay={(date, typeId) => setSelectedDay({ date, typeId })}
          />
        )}
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
        <Typography variant="caption" sx={{ color: 'primary.dark' }}>
          ● {t('calendar.free')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'secondary.dark' }}>
          ● {t('calendar.partial')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'accent.main' }}>
          ● {t('calendar.none')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          ● {t('calendar.unlimited')}
        </Typography>
      </Stack>
      {visibleSelectedDay && (
        <DayDetail
          key={`${visibleSelectedDay.date}:${visibleSelectedDay.typeId}`}
          selected={visibleSelectedDay}
          summary={visibleSummary}
          type={visibleAccommodationType}
          typeNames={typeNames}
          typeModes={typeModes}
          unitNames={unitNames}
        />
      )}
    </Stack>
  )
}
