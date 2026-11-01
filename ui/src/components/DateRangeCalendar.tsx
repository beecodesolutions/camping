import { Box, Stack, Typography } from '@mui/material'
import { DayPicker } from '@daypicker/react'
import { es } from '@daypicker/react/locale/es'
import { useTranslation } from 'react-i18next'
import { uiProps, uiStyles } from '../app/theme'
import { dateFromIso, isoDate } from '../services/calendar'

type Props = {
  startDate: string
  endDate: string
  today: string
  disabled?: boolean
  onChange: (startDate: string, endDate: string) => void
}

export default function DateRangeCalendar({
  startDate,
  endDate,
  today,
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
      <Box sx={uiStyles.dateRangeCalendar}>
        <DayPicker
          mode="range"
          locale={es}
          timeZone="UTC"
          today={dateFromIso(today)}
          defaultMonth={dateFromIso(startDate || today)}
          selected={
            startDate
              ? {
                  from: dateFromIso(startDate),
                  to: endDate ? dateFromIso(endDate) : undefined,
                }
              : undefined
          }
          onSelect={(range) =>
            onChange(
              range?.from ? isoDate(range.from) : '',
              range?.to ? isoDate(range.to) : '',
            )
          }
          min={1}
          max={366}
          resetOnSelect
          required
          disabled={disabled}
          showOutsideDays
          fixedWeeks
          navLayout="around"
          aria-label={t('dateRange.label')}
        />
      </Box>
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
