import { Box, Paper, Stack, SvgIcon, Typography } from '@mui/material'
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
  return (
    <Paper
      component="section"
      aria-labelledby="occupancy-title"
      variant="outlined"
      sx={{ p: 2, borderRadius: 2 }}
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <SvgIcon color="primary" aria-hidden="true">
            <path d="M12 3 1 21h22L12 3Zm0 5 6.8 11H14v-6h-4v6H5.2L12 8Z" />
          </SvgIcon>
          <Typography
            id="occupancy-title"
            component="h2"
            variant="subtitle1"
            color="text.primary"
            sx={{ fontWeight: 700 }}
          >
            Ocupación actual
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
            <Typography color="text.secondary">grupos alojados</Typography>
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
            <Typography color="text.secondary">personas</Typography>
            <Typography className="occupancy-count">
              {activeVehicles}
            </Typography>
            <Typography color="text.secondary">vehículos</Typography>
          </Box>
        </Box>
      </Stack>
    </Paper>
  )
}
