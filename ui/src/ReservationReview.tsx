import { Alert, Box, Divider, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { CreationQuote } from './reservations/creationState'
import {
  reservationGuestGroups,
  reservationReviewDate,
} from './reservations/review'
import { formatMoney } from './services/money'

type Props = { quote: CreationQuote; today: string }

export default function ReservationReview({ quote, today }: Props) {
  const { t, i18n } = useTranslation()
  const price = quote.priceSnapshot
  const guests = reservationGuestGroups(quote.input)
  const money = (amount: number) =>
    formatMoney(amount, price.currency, i18n.language)
  const date = (value: string) =>
    reservationReviewDate(value, today, i18n.language)
  return (
    <Stack spacing={3} aria-label={t('reservationCreate.summary')}>
      <Box>
        <Typography variant="overline" color="text.secondary">
          {t('reservationCreate.accommodationLabel')}
        </Typography>
        <Typography component="h3" variant="h5" sx={{ fontWeight: 700 }}>
          {quote.accommodationName}
        </Typography>
        <Typography variant="body1" sx={{ mt: 1 }}>
          {quote.responsibleName}
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="body2" color="text.secondary">
            {t('reservationCreate.checkIn')}
          </Typography>
          <Typography sx={{ fontWeight: 600 }}>
            {date(quote.input.checkInDate)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {t('reservationCreate.checkOut')}
          </Typography>
          <Typography sx={{ fontWeight: 600 }}>
            {date(quote.input.checkOutDate)}
          </Typography>
        </Box>
      </Box>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ flexWrap: 'wrap', alignItems: 'center' }}
      >
        <Typography sx={{ fontWeight: 600 }}>
          {t('reservationCreate.nights', { count: price.nights })}
        </Typography>
        <Typography color="text.secondary">·</Typography>
        <Typography>
          {guests
            .map(({ name, count }) =>
              t(`reservationCreate.guest_${name}`, { count }),
            )
            .join(' · ')}
        </Typography>
      </Stack>
      <Divider />
      <Stack spacing={1}>
        {price.basis === 'per_unit' ? (
          <Typography color="text.secondary">
            {t('reservationCreate.unitRate', {
              amount: money(price.baseNightlyPriceMinor),
            })}
          </Typography>
        ) : (
          guests.map(({ name, count }) => (
            <Stack
              key={name}
              direction="row"
              sx={{ justifyContent: 'space-between', gap: 2 }}
            >
              <Typography color="text.secondary">
                {t(`reservationCreate.guest_${name}`, { count })}
              </Typography>
              <Typography sx={{ textAlign: 'right' }}>
                {count} × {money(price.rates[name])} ×{' '}
                {t('reservationCreate.nights', { count: price.nights })}
              </Typography>
            </Stack>
          ))
        )}
        {!!price.roundingMinor && (
          <Typography variant="body2" color="text.secondary">
            {t('reservationCreate.rounding', {
              amount: money(price.roundingMinor),
            })}
          </Typography>
        )}
      </Stack>
      <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'action.hover' }}>
        <Typography color="text.secondary">
          {t('reservationCreate.totalLabel')}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
          {money(price.totalMinor)}
        </Typography>
      </Box>
      {quote.occupancyWarning && (
        <Alert severity="warning">
          {t('reservationCreate.overCapacity', {
            max: quote.occupancyWarning.maxOccupancy,
            people: quote.occupancyWarning.people,
          })}
        </Alert>
      )}
      <Typography variant="body2" color="text.secondary">
        {t('reservationCreate.notHeld')}
      </Typography>
    </Stack>
  )
}
