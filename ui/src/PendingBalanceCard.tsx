import { useTranslation } from 'react-i18next'
import { Box, Paper, Stack, Typography } from '@mui/material'
import { PiggyBank } from 'lucide-react'
import LucideIcon from './components/LucideIcon'
import { formatMoney } from './services/money'

type PendingBalanceCardProps = { pendingAmountMinor: number; currency: string }

export default function PendingBalanceCard({
  pendingAmountMinor,
  currency,
}: PendingBalanceCardProps) {
  const { t, i18n } = useTranslation()
  return (
    <Paper
      component="section"
      aria-labelledby="balance-title"
      variant="outlined"
      sx={{ p: 2, borderRadius: 2, height: '100%' }}
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <LucideIcon
            icon={PiggyBank}
            sx={{ color: 'secondary.dark' }}
            aria-hidden="true"
          />
          <Typography
            id="balance-title"
            component="h2"
            variant="subtitle1"
            color="text.primary"
            sx={{ fontWeight: 700 }}
          >
            {t('home.pendingBalance')}
          </Typography>
        </Stack>
        <Box>
          <Typography
            component="p"
            variant="h3"
            sx={{
              fontWeight: 650,
              fontVariantNumeric: 'tabular-nums',
              fontSize: { xs: '2rem', sm: '2.5rem' },
              overflowWrap: 'anywhere',
            }}
          >
            {formatMoney(pendingAmountMinor, currency, i18n.language)}{' '}
            <Typography
              component="span"
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              {currency}
            </Typography>
          </Typography>
          <Typography color="text.secondary">
            {t('home.accumulatedBalance')}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  )
}
