import { useTranslation } from 'react-i18next'
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { BedDouble, LayoutGrid, Tent } from 'lucide-react'
import LucideIcon from './components/LucideIcon'

export type AccommodationFilterValue = 'total' | 'camping' | 'individual'

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
      sx={{
        flexShrink: 0,
        '& .MuiToggleButton-root.Mui-selected': {
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          '&:hover': { bgcolor: 'primary.dark' },
        },
      }}
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
            sx={{ mr: { xs: 0, sm: 0.5 }, fontSize: 17 }}
          />
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            {t(option.label)}
          </Box>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
