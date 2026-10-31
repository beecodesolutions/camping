import { uiStyles } from './app/theme'
import { useTranslation } from 'react-i18next'
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { BedDouble, LayoutGrid, Tent } from 'lucide-react'
import LucideIcon from './components/LucideIcon'
import type { AccommodationFilterValue } from './app/accommodationFilterSlice'

export default function AccommodationFilter({
  value,
  onChange,
}: {
  value: AccommodationFilterValue
  onChange: (value: AccommodationFilterValue) => void
}) {
  const { t } = useTranslation()
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(_, next: AccommodationFilterValue | null) =>
        next && onChange(next)
      }
      aria-label={t('home.occupancyFilter')}
      size="small"
      sx={uiStyles.accommodationFilterToggleButtonGroup}
    >
      {(
        [
          { value: 'total', label: 'home.occupancyTotal', icon: LayoutGrid },
          { value: 'camping', label: 'home.occupancyCamping', icon: Tent },
          {
            value: 'individual',
            label: 'home.occupancyIndividual',
            icon: BedDouble,
          },
        ] as const
      ).map((option) => (
        <ToggleButton
          key={option.value}
          value={option.value}
          aria-label={t(option.label)}
          title={t(option.label)}
        >
          <LucideIcon
            icon={option.icon}
            sx={uiStyles.accommodationFilterLucideIcon}
          />
          <Box component="span" sx={uiStyles.desktopInline}>
            {t(option.label)}
          </Box>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
