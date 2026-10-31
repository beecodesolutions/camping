import { uiProps, uiStyles } from './app/theme'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { ReservationResponse } from '@camping/contracts'
import { formatMoney } from './services/money'
import {
  useReservationCheckInMutation,
  useReservationCheckInQuoteMutation,
} from './services/api'
import { todayInTimezone } from './checkIn/schema'

type ReservationCheckInDialogProps = {
  reservation: ReservationResponse
  timezone: string
  onClose: () => void
  onSuccess: (name: string) => void
}

function errorStatus(error: unknown) {
  return typeof error === 'object' && error !== null && 'status' in error
    ? String(error.status)
    : ''
}

export default function ReservationCheckInDialog({
  reservation,
  timezone,
  onClose,
  onSuccess,
}: ReservationCheckInDialogProps) {
  const { t, i18n } = useTranslation()
  const [quote, setQuote] = useState<{
    totalMinor: number
    currency: string
  } | null>(null)
  const [arrivalDate, setArrivalDate] = useState(todayInTimezone(timezone))
  const [hasVehicle, setHasVehicle] = useState(false)
  const [vehicleDescription, setVehicleDescription] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState('')
  const [quoteReservation, quoteState] = useReservationCheckInQuoteMutation()
  const [checkIn, checkInState] = useReservationCheckInMutation()

  const requestQuote = async () => {
    setError('')
    try {
      const result = await quoteReservation({
        id: reservation.id,
        version: reservation.version,
        arrivalDate,
      }).unwrap()
      setQuote(result.priceSnapshot)
    } catch {
      setQuote(null)
      setError(t('checkIn.reservationQuoteError'))
    }
  }

  const confirm = async () => {
    if (!quote) return
    setError('')
    try {
      await checkIn({
        id: reservation.id,
        version: reservation.version,
        arrivalDate,
        acceptedTotalMinor: quote.totalMinor,
        hasVehicle,
        vehicleDescription: hasVehicle ? vehicleDescription : '',
        licensePlate: hasVehicle ? licensePlate : '',
        location,
      }).unwrap()
      onSuccess(reservation.responsibleName)
    } catch (reason) {
      setQuote(null)
      setError(
        errorStatus(reason) === '409'
          ? t('checkIn.reservationChanged')
          : t('checkIn.reservationSaveError'),
      )
    }
  }

  const busy = quoteState.isLoading || checkInState.isLoading
  return (
    <Dialog
      open
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="reservation-check-in-title"
    >
      <DialogTitle id="reservation-check-in-title">
        {t('checkIn.reservationTitle')}
      </DialogTitle>
      <DialogContent dividers>
        <Stack {...uiProps.stackForm}>
          {error && <Alert severity="error">{error}</Alert>}
          <Box>
            <Typography
              variant="h6"
              sx={uiStyles.reservationCreateDialogTypography}
            >
              {reservation.responsibleName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('checkIn.reservationGuests', {
                adults: reservation.adults,
                children: reservation.children,
                infants: reservation.infants,
              })}
            </Typography>
          </Box>
          <Divider />
          <TextField
            type="date"
            label={t('checkIn.arrivalDate')}
            value={arrivalDate}
            onChange={(event) => {
              setArrivalDate(event.target.value)
              setQuote(null)
            }}
            disabled={busy}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: {
                min: reservation.checkInDate,
                max: todayInTimezone(timezone),
              },
            }}
          />
          <Stack {...uiProps.stackSmall}>
            <Typography
              variant="subtitle1"
              sx={uiStyles.reservationCreateDialogTypography}
            >
              {t('checkIn.vehicleSection')}
            </Typography>
            <Button
              type="button"
              size="small"
              variant="outlined"
              disabled={busy}
              onClick={() => setHasVehicle((value) => !value)}
              sx={uiStyles.reservationCheckInDialogButton}
            >
              {t(hasVehicle ? 'checkIn.withoutVehicle' : 'checkIn.addVehicle')}
            </Button>
            {hasVehicle && (
              <Stack {...uiProps.responsiveRow}>
                <TextField
                  label={t('checkIn.vehicleDescription')}
                  value={vehicleDescription}
                  onChange={(event) =>
                    setVehicleDescription(event.target.value)
                  }
                  disabled={busy}
                  fullWidth
                />
                <TextField
                  label={t('checkIn.licensePlate')}
                  value={licensePlate}
                  onChange={(event) => setLicensePlate(event.target.value)}
                  disabled={busy}
                  fullWidth
                />
              </Stack>
            )}
          </Stack>
          <TextField
            label={t('checkIn.location')}
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            disabled={busy}
            fullWidth
          />
          {quote && (
            <Box sx={uiStyles.reservationCheckInDialogBox}>
              <Typography variant="body2" color="text.secondary">
                {t('checkIn.totalAtArrival')}
              </Typography>
              <Typography
                variant="h6"
                sx={uiStyles.reservationCreateDialogTypography}
              >
                {formatMoney(quote.totalMinor, quote.currency, i18n.language)}
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={uiStyles.reservationCheckInDialogDialogActions}>
        <Button onClick={onClose} disabled={busy}>
          {t('common.cancel')}
        </Button>
        {quote ? (
          <Button
            variant="contained"
            onClick={() => void confirm()}
            disabled={busy}
          >
            {t(checkInState.isLoading ? 'checkIn.saving' : 'checkIn.confirm')}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={() => void requestQuote()}
            disabled={busy || !arrivalDate}
          >
            {t(quoteState.isLoading ? 'checkIn.quoting' : 'checkIn.preview')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
