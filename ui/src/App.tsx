import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useCampingQuery } from './services/api'

import { formatMoney } from './services/money'

export default function App() {
  const { data, isFetching, isError, refetch } = useCampingQuery()

  return (
    <Container component="main" maxWidth="md" sx={{ py: { xs: 4, sm: 8 } }}>
      <Stack spacing={4}>
        <Box>
          <Stack
            direction="row"
            spacing={2}

            sx={{ mb: 1, alignItems: 'center', flexWrap: 'wrap' }}
          >
            <Typography variant="overline" color="primary">
              {data?.name ?? 'Camping'}
            </Typography>
            <Chip label="Datos de ejemplo" size="small" variant="outlined" />
          </Stack>
          <Typography
            component="h1"
            variant="h4"
            sx={{ fontWeight: 650, mb: 1 }}
          >
            Tu camping, de un vistazo
          </Typography>
          <Typography color="text.secondary">
            Ocupación actual y dinero pendiente de cobro.
          </Typography>
        </Box>
        <Box aria-busy={isFetching}>
          {isFetching && (
            <LinearProgress aria-label="Cargando resumen" sx={{ mb: 2 }} />
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
                  Reintentar
                </Button>
              }
            >
              No pudimos cargar el resumen del camping.
            </Alert>
          ) : data ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 3,
              }}
            >
              <Paper
                component="section"
                aria-labelledby="occupancy-title"
                variant="outlined"
                sx={{ p: 3 }}
              >
                <Stack spacing={2}>
                  <Typography
                    id="occupancy-title"
                    component="h2"
                    variant="subtitle1"
                    color="text.secondary"
                  >
                    Ocupación actual
                  </Typography>
                  <Box>
                    <Typography
                      component="p"
                      variant="h3"
                      sx={{ fontWeight: 650, color: 'primary.main' }}
                    >
                      {data.activeGroups}
                    </Typography>
                    <Typography color="text.secondary">
                      grupos alojados
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    {data.activePeople} personas · {data.activeVehicles}{' '}
                    vehículos
                  </Typography>
                </Stack>
              </Paper>
              <Paper
                component="section"
                aria-labelledby="balance-title"
                variant="outlined"
                sx={{ p: 3 }}
              >
                <Stack spacing={2}>
                  <Typography
                    id="balance-title"
                    component="h2"
                    variant="subtitle1"
                    color="text.secondary"
                  >
                    Pendiente de cobro
                  </Typography>
                  <Box>
                    <Typography
                      component="p"
                      variant="h3"
                      sx={{
                        fontWeight: 650,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatMoney(data.pendingAmountMinor, data.currency)}
                    </Typography>
                    <Typography color="text.secondary">
                      {data.currency} · saldo acumulado
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    Anticipos ya descontados.
                  </Typography>
                </Stack>
              </Paper>
            </Box>
          ) : null}
        </Box>
      </Stack>
    </Container>
  )
}
