import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Stack } from '@mui/material'
import { BedDouble, Tent, Users } from 'lucide-react'
import LucideIcon from './components/LucideIcon'
import type { AccommodationIdentityValue } from './services/accommodationIdentity'

export default function AccommodationIdentity({
  identity,
  meta,
  people,
}: {
  identity: AccommodationIdentityValue
  meta?: ReactNode
  people?: number
}) {
  const { t } = useTranslation()
  const icon = identity.kind === 'camping' ? Tent : BedDouble
  return (
    <Stack
      component="span"
      direction="row"
      spacing={0.5}
      sx={{
        alignItems: 'center',
        flexWrap: 'wrap',
        fontSize: '0.875rem',
        lineHeight: 1.43,
        color: 'text.secondary',
      }}
    >
      <LucideIcon
        icon={icon}
        aria-hidden="true"
        focusable="false"
        sx={(theme) => ({
          fontSize: 18,
          color:
            identity.kind === 'camping'
              ? theme.palette.mode === 'dark'
                ? 'primary.main'
                : 'primary.dark'
              : identity.kind === 'individual'
                ? theme.palette.mode === 'dark'
                  ? 'secondary.main'
                  : 'secondary.dark'
                : 'text.secondary',
        })}
      />
      <Box
        component="span"
        sx={{
          fontSize: '0.875rem',
          lineHeight: 1.43,
          color: 'text.secondary',
        }}
      >
        {identity.label}
      </Box>
      {meta !== undefined && <Box component="span">· {meta}</Box>}
      {people !== undefined && (
        <>
          <Box component="span">·</Box>
          <Stack
            component="span"
            direction="row"
            spacing={0.25}
            sx={{ alignItems: 'center' }}
          >
            <LucideIcon
              icon={Users}
              aria-hidden="true"
              focusable="false"
              sx={{ fontSize: 16, color: 'text.secondary' }}
            />
            <Box
              component="span"
              aria-label={t('stay.peopleCount', { count: people })}
            >
              {people}
            </Box>
          </Stack>
        </>
      )}
    </Stack>
  )
}
