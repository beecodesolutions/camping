import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  CssBaseline,
  IconButton,
  SvgIcon,
  ThemeProvider,
  Tooltip,
} from '@mui/material'
import { useSessionQuery } from './services/api'
import LoginScreen from './LoginScreen'
import CampingWorkspace from './CampingWorkspace'
import { darkTheme, lightTheme } from './app/theme'
import { useTimeOfDay } from './app/timeOfDay'

export default function App() {
  const { t } = useTranslation()
  const session = useSessionQuery()
  const { mode: automaticMode } = useTimeOfDay()
  const [manualMode, setManualMode] = useState<'light' | 'dark' | null>(null)
  const mode = manualMode ?? automaticMode
  const themeLabel =
    mode === 'dark' ? t('common.lightTheme') : t('common.darkTheme')
  const themeControl = (
    <Tooltip title={themeLabel}>
      <IconButton
        aria-label={themeLabel}
        onClick={() => setManualMode(mode === 'dark' ? 'light' : 'dark')}
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
  )
  return (
    <ThemeProvider theme={mode === 'dark' ? darkTheme : lightTheme}>
      <CssBaseline enableColorScheme />
      {!session.data && (
        <Box sx={{ position: 'fixed', top: 4, right: 8, zIndex: 10 }}>
          {themeControl}
        </Box>
      )}
      {session.isLoading ? (
        <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
          <CircularProgress aria-label={t('home.loading')} />
        </Box>
      ) : session.isError ? (
        <SessionError error={session.error} />
      ) : session.data ? (
        <CampingWorkspace user={session.data} themeControl={themeControl} />
      ) : (
        <LoginScreen />
      )}
    </ThemeProvider>
  )
}
function SessionError({ error }: { error: unknown }) {
  const { t } = useTranslation()
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? String(error.status)
      : ''
  if (status === '401') return <LoginScreen />
  return (
    <Box
      sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2 }}
    >
      <Alert
        severity="error"
        action={
          <Button onClick={() => location.reload()}>{t('common.retry')}</Button>
        }
      >
        {t('auth.sessionError')}
      </Alert>
    </Box>
  )
}
