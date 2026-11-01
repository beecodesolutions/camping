import { useState } from 'react'
import {
  Alert,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { AccommodationType } from '@camping/contracts'
import { useTranslation } from 'react-i18next'
import { uiProps } from '../app/theme'
import DateRangeCalendar from '../components/DateRangeCalendar'
import CalendarLegend from '../components/CalendarLegend'
import type { CalendarDayStatus } from '../components/Calendar'
import { useAvailabilityQuery } from '../services/api'
import { availabilityForDate, monthKey, monthRange } from '../services/calendar'

type Props = {
  open: boolean
  types: AccommodationType[]
  startDate: string
  endDate: string
  today: string
  disabled: boolean
  onChange: (startDate: string, endDate: string) => void
}

export default function ReservationAvailabilityCalendar({
  open,
  types,
  startDate,
  endDate,
  today,
  disabled,
  onChange,
}: Props) {
  const { t } = useTranslation()
  const [month, setMonth] = useState(monthKey(startDate || today))
  const [typeId, setTypeId] = useState('')
  const enabledTypes = types.filter((type) => type.enabled)
  const selectedType =
    enabledTypes.find((type) => type.id === typeId) ??
    enabledTypes.find((type) => type.inventoryMode === 'individual') ??
    enabledTypes[0]
  const range = monthRange(month)
  const query = useAvailabilityQuery(
    {
      checkInDate: range.start,
      checkOutDate: range.end,
      typeId: selectedType?.id,
    },
    { skip: !open || !selectedType },
  )
  const availability = query.currentData?.types.find(
    (type) => type.typeId === selectedType?.id,
  )
  const days: Record<string, CalendarDayStatus> = Object.fromEntries(
    range.days
      .filter((day) => day.inMonth)
      .flatMap((day) => {
        const summary = availabilityForDate(availability, day.date)
        if (!summary) return []
        const label =
          summary.tone === 'unlimited'
            ? t('calendar.unlimitedReservations', { count: summary.reserved })
            : `${t('calendar.freeCount', { count: summary.available ?? 0 })}, ${t('calendar.occupiedCount', { count: summary.reserved })}, ${t('calendar.blockedCount', { count: summary.blocked })}`
        return [[day.date, { tone: summary.tone, label }]]
      }),
  )
  return (
    <Stack {...uiProps.stackStandard}>
      {selectedType && (
        <TextField
          select
          fullWidth
          label={t('reservationCreate.occupancyType')}
          value={selectedType.id}
          onChange={(event) => setTypeId(event.target.value)}
        >
          {enabledTypes.map((type) => (
            <MenuItem key={type.id} value={type.id}>
              {type.name}
            </MenuItem>
          ))}
        </TextField>
      )}
      <Typography variant="caption" color="text.secondary">
        {t('reservationCreate.occupancyHelp')}
      </Typography>
      {query.isFetching && (
        <Typography role="status">{t('common.loading')}</Typography>
      )}
      {query.isError && (
        <Alert
          severity="warning"
          action={
            <Button onClick={() => void query.refetch()}>
              {t('common.retry')}
            </Button>
          }
        >
          {t('calendar.loadError')}
        </Alert>
      )}
      <DateRangeCalendar
        startDate={startDate}
        endDate={endDate}
        today={today}
        minDate={today}
        month={month}
        onMonthChange={setMonth}
        days={days}
        disabled={disabled}
        onChange={onChange}
      />
      <CalendarLegend />
    </Stack>
  )
}
