import { uiProps, uiStyles } from './app/theme'
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
      sx={uiStyles.pendingBalanceCardPaper}
    >
      <Stack {...uiProps.stackStandard}>
        <Stack
          {...uiProps.rowSmall}

          sx={uiStyles.alignCenter}
        >
          <LucideIcon
            icon={PiggyBank}
            sx={uiStyles.goldIcon}
            aria-hidden="true"
          />
          <Typography
            id="balance-title"
            component="h2"
            variant="subtitle1"
            color="text.primary"
            sx={uiStyles.boldText}
          >
            {t('home.pendingBalance')}
          </Typography>
        </Stack>
        <Box>
          <Typography
            component="p"
            variant="metricLarge"
            sx={uiStyles.pageTitle}
          >
            {formatMoney(pendingAmountMinor, currency, i18n.language, {
              hideCurrency: true,
            })}{' '}
            <Typography
              component="span"
              variant="body2"
              color="text.secondary"
              sx={uiStyles.pendingBalanceCardTypography3}
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
