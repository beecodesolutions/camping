import { Checkbox, FormControlLabel, TextField } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { AgeRanges } from '@camping/contracts'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import type { ReservationFormValues } from './reservations/schema'
export default function ReservationGuestFields({
  ageRanges,
  register,
  errors,
  onChange,
}: {
  ageRanges: AgeRanges
  register: UseFormRegister<ReservationFormValues>
  errors: FieldErrors<ReservationFormValues>
  onChange: () => void
}) {
  const { t } = useTranslation()
  return (['adults', 'children', 'infants', 'pets'] as const).map((name) => {
    const range = name === 'pets' ? null : ageRanges[name]
    const message = errors[name]?.message
    return (
      <TextField
        key={name}
        label={
          range
            ? `${t(`checkIn.${name}`)} (${range.max === null ? `${range.min}+` : `${range.min}–${range.max}`})`
            : t('pricing.pets')
        }
        onChange={onChange}
        type="number"
        required
        fullWidth
        error={!!errors[name]}
        helperText={
          message
            ? t(message, { defaultValue: t('validation.invalid') })
            : undefined
        }
        slotProps={{
          htmlInput: {
            ...register(name, { valueAsNumber: true }),
            min: 0,
            step: 1,
            inputMode: 'numeric',
          },
        }}
      />
    )
  })
}
export function CapacitySearchOption({
  checked = false,
  onChange,
}: {
  checked?: boolean
  onChange: (value: boolean) => void
}) {
  const { t } = useTranslation()
  return (
    <FormControlLabel
      control={
        <Checkbox checked={checked} onChange={(_e, value) => onChange(value)} />
      }
      label={t('pricing.includeInsufficient')}
    />
  )
}
