import { Box, Stack, Typography } from '@mui/material'
import Calendar, { type CalendarDayStatus } from './Calendar'
import { useTranslation } from 'react-i18next'
import { uiProps, uiStyles } from '../app/theme'
import { dateFromIso } from '../services/calendar'

type Props = {
  startDate: string
  endDate: string
  today: string
  minDate?: string
  month?: string
  onMonthChange?: (month: string) => void
  days?: Record<string, CalendarDayStatus>
  disabled?: boolean
  onChange: (startDate: string, endDate: string) => void
}

export default function DateRangeCalendar({
  startDate,
  endDate,
  today,
  minDate,
  month,
  onMonthChange,
  days,
  disabled = false,
  onChange,
}: Props) {
  const { t, i18n } = useTranslation()
  const date = (value: string) =>
    value
      ? new Intl.DateTimeFormat(i18n.language, {
          day: 'numeric',
          month: 'long',
          ...(value.slice(0, 4) !== today.slice(0, 4)
            ? { year: 'numeric' }
            : {}),
          timeZone: 'UTC',
        }).format(dateFromIso(value))
      : t('dateRange.selectDate')
  return (
    <Stack {...uiProps.stackStandard}>
      <Typography variant="body2" color="text.secondary">
        {t('dateRange.help')}
      </Typography>
      <Calendar
        mode="range"
        startDate={startDate}
        endDate={endDate}
        today={today}
        minDate={minDate}
        month={month}
        onMonthChange={onMonthChange}
        days={days}
        disabled={disabled}
        onChange={onChange}
      />
      <Box sx={uiStyles.reservationReviewBox} aria-live="polite">
        <Box>
          <Typography variant="body2" color="text.secondary">
            {t('dateRange.start')}
          </Typography>
          <Typography>{date(startDate)}</Typography>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {t('dateRange.end')}
          </Typography>
          <Typography>{date(endDate)}</Typography>
        </Box>
      </Box>
    </Stack>
  )
}
