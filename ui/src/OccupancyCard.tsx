import { useTranslation } from 'react-i18next'
import { Box, Paper, Stack, Typography } from '@mui/material'
import { Tent } from 'lucide-react'
import LucideIcon from './components/LucideIcon'
import type { CampingProfile } from './services/api'

type OccupancyCardProps = Pick<
  CampingProfile,
  'activeGroups' | 'activePeople' | 'activeVehicles'
>

export default function OccupancyCard({
  activeGroups,
  activePeople,
  activeVehicles,
}: OccupancyCardProps) {
  const { t } = useTranslation()
  return (
    <Paper
      component="section"
      aria-labelledby="occupancy-title"
      variant="outlined"
      sx={{ p: 2, borderRadius: 2, height: '100%' }}
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <LucideIcon icon={Tent} color="primary" aria-hidden="true" />
          <Typography
            id="occupancy-title"
            component="h2"
            variant="subtitle1"
            color="text.primary"
            sx={{ fontWeight: 700 }}
          >
            {t('home.occupancy')}
          </Typography>
        </Stack>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 2,
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography
              component="p"
              variant="h3"
              sx={{ fontWeight: 650, color: 'primary.main' }}
            >
              {activeGroups}
            </Typography>
            <Typography color="text.secondary">
              {t('home.groups', { count: activeGroups })}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'max-content max-content',
              alignItems: 'center',
              justifyContent: 'start',
              columnGap: 0.75,
              rowGap: 0.5,
              '& > .occupancy-count': {
                fontWeight: 700,
                fontSize: '1.5rem',
                lineHeight: 1.2,
                color: 'accent.main',
                fontVariantNumeric: 'tabular-nums',
                textAlign: 'right',
              },
            }}
          >
            <Typography className="occupancy-count">{activePeople}</Typography>
            <Typography color="text.secondary">
              {t('home.people', { count: activePeople })}
            </Typography>
            <Typography className="occupancy-count">
              {activeVehicles}
            </Typography>
            <Typography color="text.secondary">
              {t('home.vehicles', { count: activeVehicles })}
            </Typography>
          </Box>
        </Box>
      </Stack>
    </Paper>
  )
}
