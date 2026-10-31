import { uiProps, uiStyles } from './app/theme'
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
import { availabilityTone } from './app/theme'
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

type Props = { profile: CampingProfile; refreshKey?: number }
type SelectedDay = { date: string; typeId: string } | null

function monthLabel(value: string, language: string) {
  return new Intl.DateTimeFormat(language, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dateFromIso(`${value}-01`))
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
    <Paper component="section" variant="outlined" sx={uiStyles.compactPanel}>
      <Box sx={uiStyles.availabilityGridBox}>
        {weekdays.map((weekday) => (
          <Typography
            key={weekday}
            variant="caption"
            color="text.secondary"
            sx={uiStyles.availabilityCalendarTypography}
          >
            {weekday}
          </Typography>
        ))}
        {cells.map((cell) => {
          const summary = availabilityForDate(nights, cell.date)
          const colors = summary
            ? availabilityTone(summary.tone, theme)
            : undefined
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
              sx={uiStyles.availabilityCalendarButton(
                cell.inMonth,
                colors?.color,
                colors?.backgroundColor,
                isSelected,
                theme,
              )}
            >
              <Typography
                variant="body2"
                component="span"
                sx={uiStyles.availabilityCalendarTypography2(
                  isToday,
                  isSelected,
                )}
              >
                {cell.day}
              </Typography>
              {isToday && (
                <Box
                  component="span"
                  aria-hidden="true"
                  sx={uiStyles.availabilityCalendarBox}
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
      sx={uiStyles.compactPanel}
    >
      <Stack {...uiProps.row} sx={uiStyles.dayDetailStack}>
        <Box>
          <Typography
            id="calendar-day-detail-title"
            component="h3"
            variant="subtitle1"
            sx={uiStyles.boldText}
          >
            {new Intl.DateTimeFormat(i18n.language, {
              dateStyle: 'full',
              timeZone: 'UTC',
            }).format(new Date(`${selected.date}T12:00:00Z`))}
          </Typography>
        </Box>
      </Stack>
      <Box sx={uiStyles.dayDetailBox}>
        {!summary ? (
          <Typography color="text.secondary" sx={uiStyles.bottomGap}>
            {t('common.loading')}
          </Typography>
        ) : summary.tone === 'unlimited' ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={uiStyles.bottomGap}
          >
            {t('calendar.unlimitedReservations', { count: summary.reserved })}
          </Typography>
        ) : (
          <Stack {...uiProps.rowSmall} sx={uiStyles.dayDetailStack2}>
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
        <Stack {...uiProps.stackMedium}>
          {currentReservations.map((reservation) => (
            <Box key={reservation.id} sx={uiStyles.availabilityCalendarBox2}>
              <Stack {...uiProps.row} sx={uiStyles.availabilityCalendarStack}>
                <Typography sx={uiStyles.boldText}>
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

export default function AvailabilityCalendar({
  profile,
  refreshKey = 0,
}: Props) {
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
    <Stack {...uiProps.stackMedium}>
      <Stack
        {...uiProps.rowCompact}

        sx={uiStyles.availabilityCalendarStack2}
      >
        <IconButton
          aria-label={t('common.previous')}
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          <LucideIcon icon={ChevronLeft} />
        </IconButton>
        <Typography sx={uiStyles.availabilityCalendarTypography4}>
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
          sx={uiStyles.availabilityCalendarToggleButtonGroup}
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
      <Stack
        {...uiProps.rowMedium}

        sx={uiStyles.wrapRow}
      >
        <Typography
          variant="caption"
          sx={uiStyles.availabilityCalendarTypography5}
        >
          ● {t('calendar.free')}
        </Typography>
        <Typography variant="caption" sx={uiStyles.goldIcon}>
          ● {t('calendar.partial')}
        </Typography>
        <Typography
          variant="caption"
          sx={uiStyles.availabilityCalendarTypography7}
        >
          ● {t('calendar.none')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          ● {t('calendar.unlimited')}
        </Typography>
      </Stack>
      {visibleSelectedDay && (
        <DayDetail
          key={`${visibleSelectedDay.date}:${visibleSelectedDay.typeId}:${refreshKey}`}
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
