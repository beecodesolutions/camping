import { useTranslation } from 'react-i18next'
import { Box, Paper, Stack, SvgIcon, Typography } from '@mui/material'
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
      sx={{ p: 2, borderRadius: 2 }}
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <SvgIcon sx={{ color: 'secondary.dark' }} aria-hidden="true">
            <path d="M3 5h18v14H3V5Zm2 2v10h14V7H5Zm7 1a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
          </SvgIcon>
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
