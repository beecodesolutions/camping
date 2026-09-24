import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useLoginMutation } from './services/api'

export default function LoginScreen() {
  const { t } = useTranslation()
  const [login, state] = useLoginMutation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await login({ username, password })
  }
  return (
    <Box
      component="main"
      sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2 }}
    >
      <Paper
        component="form"
        onSubmit={submit}
        variant="outlined"
        sx={{ p: 3, width: '100%', maxWidth: 420 }}
      >
        <Stack spacing={2}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            {t('auth.title')}
          </Typography>
          <Typography color="text.secondary">{t('auth.subtitle')}</Typography>
          {state.isError && <Alert severity="error">{t('auth.invalid')}</Alert>}
          <TextField
            label={t('auth.username')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            autoFocus
          />
          <TextField
            label={t('auth.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
          />
          <Button type="submit" variant="contained" disabled={state.isLoading}>
            {t(state.isLoading ? 'auth.loading' : 'auth.login')}
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
