import { uiStyles, darkTheme, lightTheme } from './app/theme'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  CssBaseline,
  IconButton,
  ThemeProvider,
  Tooltip,
} from '@mui/material'
import { Moon, Sun } from 'lucide-react'
import LucideIcon from './components/LucideIcon'
import { useSessionQuery } from './services/api'
import LoginScreen from './LoginScreen'
import CampingWorkspace from './CampingWorkspace'
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
        <LucideIcon icon={mode === 'dark' ? Sun : Moon} />
      </IconButton>
    </Tooltip>
  )
  return (
    <ThemeProvider theme={mode === 'dark' ? darkTheme : lightTheme}>
      <CssBaseline enableColorScheme />
      {!session.data && (
        <Box sx={uiStyles.sessionThemeControl}>{themeControl}</Box>
      )}
      {session.isLoading ? (
        <Box sx={uiStyles.appBox2}>
          <CircularProgress aria-label={t('home.loading')} />
        </Box>
      ) : session.isError ? (
        <SessionError error={session.error} />
      ) : session.data ? (
        <CampingWorkspace
          user={session.data}
          themeMode={mode}
          onToggleTheme={() =>
            setManualMode(mode === 'dark' ? 'light' : 'dark')
          }
        />
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
    <Box sx={uiStyles.centeredPage}>
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
