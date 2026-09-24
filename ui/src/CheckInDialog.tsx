import { Controller, useForm, useWatch } from 'react-hook-form'
import type { AgeRanges } from '@camping/contracts'
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
  InputAdornment,
  Divider,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import CountrySelect from './checkIn/CountrySelect'
import { useCreateStayMutation } from './services/api'
import {
  checkInDefaults,
  checkInSchemaForTimezone,
  todayInTimezone,
  type CheckInValues,
  type CheckInRequest,
} from './checkIn/schema'

type CheckInDialogProps = {
  onClose: () => void
  onSuccess: (name: string) => void
  timezone?: string
  ageRanges?: AgeRanges
}

export default function CheckInDialog({
  onClose,
  onSuccess,
  timezone = 'America/Santiago',
  ageRanges,
}: CheckInDialogProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const [createStay, { isError }] = useCreateStayMutation()
  const {
    register,
    control,
    setValue,
    getFieldState,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckInValues, undefined, CheckInRequest>({
    resolver: zodResolver(checkInSchemaForTimezone(timezone)),
    defaultValues: checkInDefaults(timezone),
  })
  const hasVehicle = useWatch({ control, name: 'hasVehicle' })
  const arrivalDate = useWatch({ control, name: 'arrivalDate' })
  const errorText = (message: string | undefined) =>
    message ? t(message, { defaultValue: t('validation.invalid') }) : undefined

  const submit = handleSubmit(async (values) => {
    try {
      await createStay(values).unwrap()
      onSuccess(values.responsibleName)
    } catch {
      // The mutation error is shown below; entered values remain available to retry.
    }
  })

  return (
    <Dialog
      open
      onClose={isSubmitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
      aria-labelledby="check-in-title"
    >
      <DialogTitle id="check-in-title">{t('checkIn.title')}</DialogTitle>
      <Box
        component="form"
        noValidate
        onSubmit={submit}
        sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
      >
        <DialogContent dividers>
          <Stack spacing={2.5}>
            {isError && (
              <Alert severity="error">{t('checkIn.saveError')}</Alert>
            )}
            <Box
              component="fieldset"
              disabled={isSubmitting}
              sx={{ m: 0, p: 0, border: 0, minWidth: 0 }}
            >
              <Stack spacing={2.5}>
                <Stack
                  component="section"
                  aria-labelledby="check-in-responsible-title"
                  spacing={2}
                >
                  <Typography
                    id="check-in-responsible-title"
                    component="h2"
                    variant="subtitle1"
                    sx={{ fontWeight: 700 }}
                  >
                    {t('checkIn.responsibleSection')}
                  </Typography>
                  <TextField
                    label={t('checkIn.responsibleName')}
                    required
                    autoFocus
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
                          disabled={isSubmitting}
                          error={errorText(errors.nationality?.message)}
                          onChange={(country) => {
                            field.onChange(country)
                            if (!getFieldState('phoneCountry').isDirty)
                              setValue('phoneCountry', country, {
                                shouldValidate: true,
                              })
                          }}
                        />
                      )}
                    />
                    <TextField
                      label={t('checkIn.document')}
                      fullWidth
                      slotProps={{ htmlInput: register('document') }}
                    />
                  </Stack>
                  <TextField
                    label={t('checkIn.phone')}
                    type="tel"
                    autoComplete="tel-national"
                    fullWidth
                    error={!!errors.phone || !!errors.phoneCountry}
                    helperText={errorText(
                      errors.phone?.message ?? errors.phoneCountry?.message,
                    )}
                    slotProps={{
                      htmlInput: register('phone'),
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
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
                                  disabled={isSubmitting}
                                  callingCode
                                />
                              )}
                            />
                            <Divider
                              orientation="vertical"
                              sx={{
                                height: 28,
                                ml: 0.5,
                                borderColor: 'text.secondary',
                                flexShrink: 0,
                              }}
                            />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Stack>
                <Divider />
                <Stack
                  component="section"
                  aria-labelledby="check-in-reservation-title"
                  spacing={2}
                >
                  <Typography
                    id="check-in-reservation-title"
                    component="h2"
                    variant="subtitle1"
                    sx={{ fontWeight: 700 }}
                  >
                    {t('checkIn.reservationSection')}
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label={t('checkIn.arrivalDate')}
                      type="date"
                      required
                      fullWidth
                      error={!!errors.arrivalDate}
                      helperText={errorText(errors.arrivalDate?.message)}
                      slotProps={{
                        inputLabel: { shrink: true },
                        htmlInput: {
                          ...register('arrivalDate'),
                          max: todayInTimezone(timezone),
                        },
                      }}
                    />
                    <TextField
                      label={t('checkIn.estimatedDeparture')}
                      type="date"
                      fullWidth
                      error={!!errors.estimatedDeparture}
                      helperText={errorText(errors.estimatedDeparture?.message)}
                      slotProps={{
                        inputLabel: { shrink: true },
                        htmlInput: {
                          ...register('estimatedDeparture'),
                          min: arrivalDate,
                        },
                      }}
                    />
                  </Stack>
                  <Box>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr',
                          sm: 'repeat(3, 1fr)',
                        },
                        gap: 2,
                      }}
                    >
                      {(['adults', 'children', 'infants'] as const).map(
                        (name) => (
                          <TextField
                            key={name}
                            label={`${t(`checkIn.${name}`)}${ageRanges ? ` (${ageRanges[name].max === null ? `${ageRanges[name].min}+` : `${ageRanges[name].min}–${ageRanges[name].max}`})` : ''}`}
                            type="number"
                            required
                            fullWidth
                            error={!!errors[name]}
                            helperText={errorText(errors[name]?.message)}
                            slotProps={{
                              htmlInput: {
                                ...register(name, { valueAsNumber: true }),
                                min: 0,
                                step: 1,
                                inputMode: 'numeric',
                              },
                            }}
                          />
                        ),
                      )}
                    </Box>
                  </Box>
                </Stack>
                <Divider />
                <Stack
                  component="section"
                  aria-labelledby="check-in-vehicle-title"
                  spacing={2}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography
                      id="check-in-vehicle-title"
                      component="h2"
                      variant="subtitle1"
                      sx={{ fontWeight: 700 }}
                    >
                      {t('checkIn.vehicleSection')}
                    </Typography>
                    <Button
                      type="button"
                      size="small"
                      variant="outlined"
                      disabled={isSubmitting}
                      onClick={() =>
                        setValue('hasVehicle', !hasVehicle, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    >
                      {t(
                        hasVehicle
                          ? 'checkIn.withoutVehicle'
                          : 'checkIn.addVehicle',
                      )}
                    </Button>
                  </Stack>
                  {hasVehicle && (
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        label={t('checkIn.vehicleDescription')}
                        fullWidth
                        slotProps={{
                          htmlInput: register('vehicleDescription'),
                        }}
                      />
                      <TextField
                        label={t('checkIn.licensePlate')}
                        fullWidth
                        slotProps={{ htmlInput: register('licensePlate') }}
                      />
                    </Stack>
                  )}
                </Stack>
                <Divider />
                <Stack
                  component="section"
                  aria-labelledby="check-in-notes-title"
                  spacing={2}
                >
                  <Typography
                    id="check-in-notes-title"
                    component="h2"
                    variant="subtitle1"
                    sx={{ fontWeight: 700 }}
                  >
                    {t('checkIn.notesSection')}
                  </Typography>
                  <TextField
                    label={t('checkIn.location')}
                    fullWidth
                    helperText={t('checkIn.locationHint')}
                    slotProps={{ htmlInput: register('location') }}
                  />
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {t(isSubmitting ? 'checkIn.saving' : 'checkIn.submit')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
