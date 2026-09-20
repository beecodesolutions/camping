import { Box, Typography } from '@mui/material'
import CampingIllustration from './assets/CampingIllustration'

type HomeHeaderProps = { name: string }

export default function HomeHeader({ name }: HomeHeaderProps) {
  return (
    <Box
      component="header"
      sx={{
        color: 'primary.dark',
        py: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexDirection: { xs: 'column', sm: 'row' },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
        <Typography
          variant="overline"
          sx={{
            display: 'block',
            mb: 2,
            color: 'primary.main',
            letterSpacing: 2,
          }}
        >
          {name}
        </Typography>
        <Typography
          component="h1"
          variant="h4"
          sx={{
            fontWeight: 650,
            mb: 1.5,
            fontSize: { xs: '1.8rem', sm: '2.125rem' },
            lineHeight: 1.2,
          }}
        >
          Tu camping, de un vistazo
        </Typography>
      </Box>
      <CampingIllustration />
    </Box>
  )
}
