import { useEffect, useReducer, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  reservationCreateSchema,
  type CampingProfile,
  type ReservationCreate,
  todayInTimezone,
} from '@camping/contracts'
import CountrySelect from './checkIn/CountrySelect'
import ReservationReview from './ReservationReview'
import { departureForNights, reservationNights } from './reservations/dates'
import {
  useAccommodationTypesQuery,
  useAccommodationUnitsQuery,
  useReservationCreateMutation,
  useReservationQuoteCreateMutation,
} from './services/api'
import { formatMoney } from './services/money'
import { createUuid } from './services/uuid'
import {
  creationReducer,
  initialCreationState,
  reservationFailure,
} from './reservations/creationState'
import {
  reservationContact,
  reservationDefaults,
  reservationFormSchema,
  reservationQuoteInput,
  reservationValidationFields,
  type ReservationFormValues,
} from './reservations/schema'

type Props = {
  open: boolean
  profile: CampingProfile
  onClose: () => void
  onSuccess: (name: string) => void
}

// Kept mounted by the workspace so Back/reopening preserves uncertain attempts.
export default function ReservationCreateDialog({
  open,
  profile,
  onClose,
  onSuccess,
}: Props) {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const typesQuery = useAccommodationTypesQuery(undefined, { skip: !open })
  const unitsQuery = useAccommodationUnitsQuery(undefined, { skip: !open })
  const types = typesQuery.data ?? []
  const units = unitsQuery.data ?? []
  const usableTypes = types.filter(
    (type) =>
      type.enabled &&
      (type.inventoryMode === 'unlimited' ||
        units.some((unit) => unit.enabled && unit.typeId === type.id)),
  )
  const [state, dispatch] = useReducer(creationReducer, initialCreationState)
  const [requestQuote, quoteRequest] = useReservationQuoteCreateMutation()
  const [createReservation] = useReservationCreateMutation()
  const contentRef = useRef<HTMLDivElement>(null)
  const sending = useRef(false)
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getFieldState,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationFormSchema(types, units)),
    defaultValues: reservationDefaults(profile.timezone),
  })
  const typeId = useWatch({ control, name: 'accommodationTypeId' })
  const checkInDate = useWatch({ control, name: 'checkInDate' })
  const checkOutDate = useWatch({ control, name: 'checkOutDate' })
  const [nightsDraft, setNightsDraft] = useState<string | null>(null)
  const nights = reservationNights(checkInDate, checkOutDate)
  const invalidNights =
    nightsDraft !== null &&
    departureForNights(checkInDate, nightsDraft) === null
  const selectedType = types.find((type) => type.id === typeId)
  const availableUnits = units.filter(
    (unit) => unit.typeId === typeId && unit.enabled,
  )
  const locked = state.attempt !== null
  const saving = state.phase === 'saving'
  const loading = typesQuery.isLoading || unitsQuery.isLoading
  const inventoryError = typesQuery.isError || unitsQuery.isError
  const noInventory = !loading && !inventoryError && usableTypes.length === 0
  const quote = state.quote
  const reviewing = quote !== null
  useEffect(() => {
    if (open) {
      contentRef.current?.scrollTo({ top: 0 })
      if (reviewing) contentRef.current?.focus({ preventScroll: true })
    }
  }, [open, reviewing])
  const changed = () => dispatch({ type: 'change' })
  const datesChanged = () => {
    setNightsDraft(null)
    changed()
  }
  const nightsChanged = (value: string) => {
    changed()
    const departure = departureForNights(checkInDate, value)
    setNightsDraft(departure ? null : value)
    if (departure)
      setValue('checkOutDate', departure, {
        shouldDirty: true,
        shouldValidate: true,
      })
  }
  const errorText = (message?: string) =>
    message ? t(message, { defaultValue: t('validation.invalid') }) : undefined

  const quoteValues = handleSubmit(async (values) => {
    if (!selectedType || locked) return
    const revision = state.revision
    const input = reservationQuoteInput(values, selectedType)
    const unit = units.find((item) => item.id === input.unitId)
    dispatch({ type: 'quote-start' })
    try {
      const result = await requestQuote(input).unwrap()
      dispatch({
        type: 'quote-success',
        revision,
        quote: {
          ...result,
          input,
          responsibleName: values.responsibleName,
          accommodationName: unit
            ? `${selectedType.name} · ${unit.name}`
            : selectedType.name,
        },
      })
    } catch (error) {
      for (const name of reservationValidationFields(error))
        setError(name, { type: 'server', message: 'validation.invalid' })
      const failure = reservationFailure(error)
      dispatch({
        type: 'quote-error',
        revision,
        error: failure.uncertain
          ? 'reservationCreate.quoteError'
          : failure.message,
      })
    }
  })

  const saveAttempt = async (attempt: ReservationCreate) => {
    if (sending.current) return
    sending.current = true
    dispatch({ type: 'save-start', attempt })
    try {
      const result = await createReservation(attempt).unwrap()
      dispatch({ type: 'reset' })
      reset(reservationDefaults(profile.timezone))
      onSuccess(result.responsibleName)
    } catch (error) {
      for (const name of reservationValidationFields(error))
        setError(name, { type: 'server', message: 'validation.invalid' })
      const failure = reservationFailure(error)
      dispatch({
        type: 'save-error',
        uncertain: failure.uncertain,
        error: failure.message,
      })
    } finally {
      sending.current = false
    }
  }

  const saveValues = () =>
    handleSubmit(
      async (values) => {
        if (!quote) return
        const attempt = reservationCreateSchema.parse({
          ...quote.input,
          ...reservationContact(values),
          acceptedTotalMinor: quote.priceSnapshot.totalMinor,
          idempotencyKey: createUuid(),
        })
        await saveAttempt(attempt)
      },
      () => dispatch({ type: 'change' }),
    )()

  const money = (amount: number) =>
    formatMoney(
      amount,
      quote?.priceSnapshot.currency ?? profile.currency,
      i18n.language,
    )
  const retryInventory = () => {
    void typesQuery.refetch()
    void unitsQuery.refetch()
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
      aria-labelledby="reservation-create-title"
    >
      <DialogTitle id="reservation-create-title">
        {t(reviewing ? 'reservationCreate.summary' : 'reservationCreate.title')}
      </DialogTitle>
      <Box
        component="form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (!saving && !quoteRequest.isLoading && !invalidNights)
            void (state.attempt
              ? saveAttempt(state.attempt)
              : quote
                ? saveValues()
                : quoteValues(event))
        }}
        sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
      >
        <DialogContent
          dividers
          ref={contentRef}
          tabIndex={-1}
          sx={{ outline: 'none' }}
        >
          <Stack spacing={2.5}>
            {state.error && (
              <Alert severity="error">{errorText(state.error)}</Alert>
            )}
            {!reviewing && loading && (
              <Typography role="status">{t('common.loading')}</Typography>
            )}
            {!reviewing && inventoryError && (
              <Alert
                severity="error"
                action={
                  <Button onClick={retryInventory}>{t('common.retry')}</Button>
                }
              >
                {t('reservationCreate.inventoryError')}
              </Alert>
            )}
            {!reviewing && noInventory && (
              <Alert severity="info">
                {t('reservationCreate.noInventory')}
              </Alert>
            )}
            <Box
              component="fieldset"
              hidden={reviewing}
              disabled={locked || loading || inventoryError || noInventory}
              sx={{ m: 0, p: 0, border: 0, minWidth: 0 }}
            >
              <Stack spacing={2.5}>
                <Typography
                  component="h2"
                  variant="subtitle1"
                  sx={{ fontWeight: 700 }}
                >
                  {t('reservationCreate.accommodationSection')}
                </Typography>
                <Controller
                  name="accommodationTypeId"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      disabled={
                        locked || loading || inventoryError || noInventory
                      }
                      fullWidth
                      required
                      label={t('reservationCreate.type')}
                      error={!!errors.accommodationTypeId}
                      helperText={errorText(
                        errors.accommodationTypeId?.message,
                      )}
                      onChange={(event) => {
                        field.onChange(event)
                        setValue('unitId', '', { shouldDirty: true })
                        changed()
                      }}
                    >
                      {usableTypes.map((type) => (
                        <MenuItem key={type.id} value={type.id}>
                          {type.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                {selectedType?.inventoryMode === 'individual' && (
                  <Controller
                    name="unitId"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        disabled={
                          locked || loading || inventoryError || noInventory
                        }
                        fullWidth
                        required
                        label={t('reservationCreate.unit')}
                        error={!!errors.unitId}
                        helperText={errorText(errors.unitId?.message)}
                        onChange={(event) => {
                          field.onChange(event)
                          changed()
                        }}
                      >
                        {availableUnits.map((unit) => (
                          <MenuItem key={unit.id} value={unit.id}>
                            {unit.name} ·{' '}
                            {t('reservationCreate.capacity', {
                              count: unit.maxOccupancy,
                            })}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                )}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'minmax(0, 1fr)',
                      sm: 'minmax(0, 1fr) minmax(0, 1fr) 100px',
                    },
                    gap: 2,
                  }}
                >
                  <TextField
                    label={t('reservationCreate.checkIn')}
                    type="date"
                    fullWidth
                    required
                    error={!!errors.checkInDate}
                    helperText={errorText(errors.checkInDate?.message)}
                    slotProps={{
                      inputLabel: { shrink: true },
                      htmlInput: register('checkInDate', {
                        onChange: datesChanged,
                      }),
                    }}
                  />
                  <TextField
                    label={t('reservationCreate.checkOut')}
                    type="date"
                    fullWidth
                    required
                    error={!!errors.checkOutDate}
                    helperText={errorText(errors.checkOutDate?.message)}
                    slotProps={{
                      inputLabel: { shrink: true },
                      htmlInput: {
                        ...register('checkOutDate', { onChange: datesChanged }),
                        min: checkInDate,
                      },
                    }}
                  />
                  <TextField
                    name="nights"
                    label={t('reservationCreate.nightsField')}
                    type="number"
                    required
                    fullWidth
                    value={nightsDraft ?? nights}
                    onChange={(event) => nightsChanged(event.target.value)}
                    disabled={locked || !checkInDate}
                    error={invalidNights}
                    helperText={
                      invalidNights
                        ? t('reservationCreate.invalidNights')
                        : undefined
                    }
                    slotProps={{
                      htmlInput: { min: 1, step: 1, inputMode: 'numeric' },
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                    gap: 2,
                  }}
                >
                  {(['adults', 'children', 'infants'] as const).map((name) => {
                    const range = profile.ageRanges[name]
                    return (
                      <TextField
                        key={name}
                        label={`${t(`checkIn.${name}`)} (${range.max === null ? `${range.min}+` : `${range.min}–${range.max}`})`}
                        type="number"
                        required
                        fullWidth
                        error={!!errors[name]}
                        helperText={errorText(errors[name]?.message)}
                        slotProps={{
                          htmlInput: {
                            ...register(name, {
                              valueAsNumber: true,
                              onChange: changed,
                            }),
                            min: 0,
                            step: 1,
                            inputMode: 'numeric',
                          },
                        }}
                      />
                    )
                  })}
                </Box>
                <Divider />
                <Typography
                  component="h2"
                  variant="subtitle1"
                  sx={{ fontWeight: 700 }}
                >
                  {t('checkIn.responsibleSection')}
                </Typography>
                <TextField
                  label={t('checkIn.responsibleName')}
                  required
                  fullWidth
                  autoComplete="name"
                  error={!!errors.responsibleName}
                  helperText={errorText(errors.responsibleName?.message)}
                  slotProps={{ htmlInput: register('responsibleName') }}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Controller
                    name="nationality"
                    control={control}
                    render={({ field }) => (
                      <CountrySelect
                        label={t('checkIn.nationality')}
                        value={field.value}
                        inputRef={field.ref}
                        onBlur={field.onBlur}
                        disabled={
                          locked || loading || inventoryError || noInventory
                        }
                        error={errorText(errors.nationality?.message)}
                        onChange={(country) => {
                          field.onChange(country)
                          if (!getFieldState('phoneCountry').isDirty)
                            setValue('phoneCountry', country)
                        }}
                      />
                    )}
                  />
                  <TextField
                    label={t('checkIn.document')}
                    fullWidth
                    error={!!errors.document}
                    helperText={errorText(errors.document?.message)}
                    slotProps={{ htmlInput: register('document') }}
                  />
                </Stack>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(140px, 2fr) minmax(0, 3fr)',
                    gap: 1,
                  }}
                >
                  <Controller
                    name="phoneCountry"
                    control={control}
                    render={({ field }) => (
                      <CountrySelect
                        label={t('checkIn.phoneCountryCode')}
                        value={field.value}
                        inputRef={field.ref}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                        disabled={
                          locked || loading || inventoryError || noInventory
                        }
                        error={errorText(errors.phoneCountry?.message)}
                        callingCode
                      />
                    )}
                  />
                  <TextField
                    label={t('checkIn.phone')}
                    type="tel"
                    fullWidth
                    autoComplete="tel-national"
                    error={!!errors.phone}
                    helperText={errorText(errors.phone?.message)}
                    slotProps={{ htmlInput: register('phone') }}
                  />
                </Box>
                <TextField
                  label={t('reservationCreate.email')}
                  type="email"
                  fullWidth
                  autoComplete="email"
                  error={!!errors.email}
                  helperText={errorText(errors.email?.message)}
                  slotProps={{ htmlInput: register('email') }}
                />
                <TextField
                  label={t('reservationCreate.notes')}
                  multiline
                  minRows={2}
                  fullWidth
                  error={!!errors.notes}
                  helperText={errorText(errors.notes?.message)}
                  slotProps={{ htmlInput: register('notes') }}
                />
              </Stack>
            </Box>
            {quote && (
              <ReservationReview
                quote={quote}
                today={todayInTimezone(profile.timezone)}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: 'wrap' }}>
          <Button
            onClick={reviewing && !locked ? changed : onClose}
            disabled={saving}
          >
            {t(
              reviewing && !locked
                ? 'reservationCreate.back'
                : locked
                  ? 'common.close'
                  : 'common.cancel',
            )}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={
              saving ||
              invalidNights ||
              isSubmitting ||
              quoteRequest.isLoading ||
              (!reviewing && (loading || inventoryError || noInventory))
            }
          >
            {saving
              ? t('checkIn.saving')
              : state.phase === 'uncertain'
                ? t('reservationCreate.retrySave')
                : quote
                  ? t('reservationCreate.createFor', {
                      amount: money(quote.priceSnapshot.totalMinor),
                    })
                  : quoteRequest.isLoading
                    ? t('checkIn.quoting')
                    : t('reservationCreate.quote')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
