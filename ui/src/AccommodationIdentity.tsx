import { uiProps, uiStyles } from './app/theme'
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
  compactMobile = false,
}: {
  identity: AccommodationIdentityValue
  meta?: ReactNode
  people?: number
  compactMobile?: boolean
}) {
  const { t } = useTranslation()
  const icon = identity.kind === 'camping' ? Tent : BedDouble
  return (
    <Stack
      component="span"
      {...uiProps.rowCompact}

      sx={uiStyles.accommodationIdentityStack(compactMobile)}
    >
      <LucideIcon
        icon={icon}
        aria-hidden="true"
        focusable="false"
        sx={uiStyles.accommodationIdentityLucideIcon(identity.kind)}
      />
      <Box
        component="span"
        sx={uiStyles.accommodationIdentityBox(compactMobile)}
      >
        {compactMobile ? (
          <>
            <Box component="span" sx={uiStyles.mobileOnlyInline}>
              {identity.compactLabel ?? identity.label}
            </Box>
            <Box component="span" sx={uiStyles.desktopInline}>
              {identity.label}
            </Box>
          </>
        ) : (
          identity.label
        )}
      </Box>
      {meta !== undefined && (
        <Box
          component="span"
          sx={uiStyles.accommodationIdentityBox4(compactMobile)}
        >
          · {meta}
        </Box>
      )}
      {people !== undefined && (
        <>
          <Box component="span">·</Box>
          <Stack
            component="span"
            {...uiProps.rowTight}

            sx={uiStyles.accommodationIdentityStack2}
          >
            <LucideIcon
              icon={Users}
              aria-hidden="true"
              focusable="false"
              sx={uiStyles.accommodationIdentityLucideIcon2}
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
