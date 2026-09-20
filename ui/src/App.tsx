import {
  Alert,
  Box,
  Button,
  Container,
  LinearProgress,
  Stack,
} from '@mui/material'
import { useCampingQuery } from './services/api'
import OccupancyChart from './OccupancyChart'
import HomeHeader from './HomeHeader'
import OccupancyCard from './OccupancyCard'
import PendingBalanceCard from './PendingBalanceCard'

export default function App() {
  const { data, isFetching, isError, refetch } = useCampingQuery()

  return (
    <Container component="main" maxWidth="md" sx={{ pb: 4 }}>
      <Stack spacing={2}>
        <HomeHeader name={data?.name ?? 'Camping'} />
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
  )
}
