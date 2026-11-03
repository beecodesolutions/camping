import { Alert, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { ReservationQuote } from '@camping/contracts'
import { uiProps } from './app/theme'
export default function ReservationOfferCapacity({
  offer,
}: {
  offer: ReservationQuote
}) {
  const { t } = useTranslation()
  return (
    <Stack {...uiProps.stackSmall}>
      {offer.capacityMatch === 'OVERSIZED' && (
        <Typography variant="body2" color="text.secondary">
          {t('pricing.oversized', { count: offer.sparePlaces ?? 0 })}
        </Typography>
      )}
      {offer.occupancyWarning && (
        <Alert severity="warning">
          {t('reservationCreate.overCapacity', {
            max: offer.occupancyWarning.maxOccupancy,
            people: offer.occupancyWarning.people,
          })}
        </Alert>
      )}
      {offer.availableBeds !== undefined && (
        <Typography variant="body2">
          {t('pricing.bedsAvailable', {
            count: offer.availableBeds,
            requested: offer.requestedBeds ?? 0,
          })}
        </Typography>
      )}
    </Stack>
  )
}
