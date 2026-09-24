import { useTranslation } from 'react-i18next'
import { Box, Button, Typography } from '@mui/material'
import CampingIllustration from './assets/CampingIllustration'

type HomeHeaderProps = {
  name: string
  greeting: string
  userName?: string
  onCheckIn?: () => void
  checkInDisabled?: boolean
  showCheckIn?: boolean
}

export default function HomeHeader({
  name,
  greeting,
  userName,
  onCheckIn,
  checkInDisabled,
  showCheckIn = true,
}: HomeHeaderProps) {
  const { t } = useTranslation()
  return (
    <Box
      component="header"
      sx={{
        color: 'text.primary',
        pt: 0,
        pb: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexDirection: { xs: 'column', md: 'row' },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flex: 1,
          minWidth: 0,
          width: '100%',
        }}
      >
        <CampingIllustration />
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="overline"
            sx={{
              display: 'block',
              mb: 0,
              lineHeight: 1.5,
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
              fontSize: { xs: '1.8rem', sm: '2.125rem' },
              lineHeight: 1.2,
              overflowWrap: 'anywhere',
            }}
          >
            {userName?.trim()
              ? t('home.greetingWithName', { greeting, name: userName.trim() })
              : greeting}
          </Typography>
        </Box>
      </Box>
      {showCheckIn && (
        <Button
          type="button"
          onClick={onCheckIn}
          disabled={checkInDisabled}
          variant="contained"
          sx={{
            width: { xs: '100%', md: 'auto' },
            flexShrink: 0,
            minHeight: 44,
          }}
        >
          {t('checkIn.register')}
        </Button>
      )}
    </Box>
  )
}
