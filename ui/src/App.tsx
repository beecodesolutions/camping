import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  Container,
  CssBaseline,
  IconButton,
  LinearProgress,
  Stack,
  SvgIcon,
  ThemeProvider,
  Tooltip,
} from '@mui/material'
import { useCampingQuery } from './services/api'
import OccupancyChart from './OccupancyChart'
import HomeHeader from './HomeHeader'
import CheckInDialog from './CheckInDialog'
import OccupancyCard from './OccupancyCard'
import PendingBalanceCard from './PendingBalanceCard'
import { darkTheme, lightTheme } from './app/theme'
import { useTimeOfDay } from './app/timeOfDay'

export default function App() {
  const { t } = useTranslation()
  const { data, isFetching, isError, refetch } = useCampingQuery()
  const { mode: automaticMode, greeting } = useTimeOfDay()
  const [manualMode, setManualMode] = useState<'light' | 'dark' | null>(null)
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [registeredName, setRegisteredName] = useState<string | null>(null)
  const mode = manualMode ?? automaticMode
  const themeLabel =
    mode === 'dark' ? t('common.lightTheme') : t('common.darkTheme')
  // Replace the demo identity with the session user when authentication is added.
  const userName =
    import.meta.env.VITE_ENABLE_MOCKS === 'true' ? 'Lucía' : undefined

  return (
    <ThemeProvider theme={mode === 'dark' ? darkTheme : lightTheme}>
      <CssBaseline enableColorScheme />
      {checkInOpen && (
        <CheckInDialog
          onClose={() => setCheckInOpen(false)}
          onSuccess={(name) => {
            setCheckInOpen(false)
            setRegisteredName(name)
          }}
        />
      )}
      <Container component="main" maxWidth="md" sx={{ pb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
          <Tooltip title={themeLabel}>
            <IconButton
              aria-label={themeLabel}
              onClick={() => setManualMode(mode === 'dark' ? 'light' : 'dark')}
              sx={{ color: 'text.primary', width: 44, height: 44 }}
            >
              <SvgIcon>
                {mode === 'dark' ? (
                  <g
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  >
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
                  </g>
                ) : (
                  <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" />
                )}
              </SvgIcon>
            </IconButton>
          </Tooltip>
        </Box>
        <Stack spacing={2}>
          <HomeHeader
            name={data?.name ?? t('common.appName')}
            greeting={t(greeting)}
            userName={userName}
            onCheckIn={() => {
              setRegisteredName(null)
              setCheckInOpen(true)
            }}
            checkInDisabled={!data || isError}
          />
          {registeredName && (
            <Alert severity="success" onClose={() => setRegisteredName(null)}>
              {t('checkIn.success', { name: registeredName })}
            </Alert>
          )}
          <Box aria-busy={isFetching}>
            {isFetching && (
              <LinearProgress aria-label={t('home.loading')} sx={{ mb: 2 }} />
            )}
            {isError ? (
              <Alert
                severity="error"
                action={
                  <Button
                    color="inherit"
                    onClick={() => void refetch()}
                    disabled={isFetching}
                  >
                    {t('common.retry')}
                  </Button>
                }
              >
                {t('home.loadError')}
              </Alert>
            ) : data ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 3,
                }}
              >
                <OccupancyCard
                  activeGroups={data.activeGroups}
                  activePeople={data.activePeople}
                  activeVehicles={data.activeVehicles}
                />
                <PendingBalanceCard
                  pendingAmountMinor={data.pendingAmountMinor}
                  currency={data.currency}
                />
                <OccupancyChart />
              </Box>
            ) : null}
          </Box>
        </Stack>
      </Container>
    </ThemeProvider>
  )
}
