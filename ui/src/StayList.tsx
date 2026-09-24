import { useTranslation } from 'react-i18next'
import {
  IconButton,
  SvgIcon,
  Tooltip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import type { Stay } from '@camping/contracts'
import { todayInTimezone } from './checkIn/schema'
import { relativeDay } from './services/relativeDay'
import { formatMoney } from './services/money'

export type StayAction = 'detail' | 'payment' | 'close' | 'extras'
export type StaySelection = { id: string; action: StayAction }

type Props = {
  items: Stay[]
  timezone: string
  onSelect: (selection: StaySelection) => void
}

export default function StayList({ items, timezone, onSelect }: Props) {
  const { t, i18n } = useTranslation()
  const today = todayInTimezone(timezone)
  if (!items.length)
    return (
      <Typography color="text.secondary" sx={{ p: 2 }}>
        {t('home.noStays')}
      </Typography>
    )
  return (
    <List disablePadding aria-label={t('home.staysList')}>
      {items.map((stay) => (
        <ListItem
          key={stay.id}
          disablePadding
          divider
          sx={{
            alignItems: 'stretch',
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          <ListItemButton
            onClick={() => onSelect({ id: stay.id, action: 'detail' })}
            sx={{ minWidth: 0, borderRadius: 1 }}
          >
            <ListItemText
              primary={stay.responsibleName}
              secondary={`${relativeDay(stay.arrivalDate, today, i18n.language)} · ${t('stay.peopleCount', { count: stay.adults + stay.children + stay.infants })}`}
              slotProps={{
                primary: { sx: { fontWeight: 600 } },
                secondary: { sx: { overflowWrap: 'anywhere' } },
              }}
            />
            {stay.closure && (
              <Typography variant="body2" sx={{ ml: 2, flexShrink: 0 }}>
                {formatMoney(
                  stay.closure.totalMinor,
                  stay.currency,
                  i18n.language,
                )}
              </Typography>
            )}
          </ListItemButton>
          <Stack
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr) minmax(0, 1.3fr) 44px',
                sm: '128px 132px 44px',
              },
              columnGap: { xs: 1, sm: 6 },
              width: { xs: '100%', sm: 'auto' },
              alignItems: 'center',
              pr: 1,
              pl: { xs: 2, sm: 0 },
              pb: { xs: 1, sm: 0 },
              justifyContent: 'flex-end',
              flexShrink: 0,
            }}
          >
            <Stack
              direction="row"
              spacing={0.5}
              sx={{
                alignItems: 'center',
                justifyContent: 'flex-end',
                minWidth: 0,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {stay.extras.length > 0
                  ? t('stay.extrasCount', { count: stay.extras.length })
                  : t('stay.noExtrasLabel')}
              </Typography>
              {!stay.closure && (
                <Tooltip title={t('stay.addExtraAction')}>
                  <IconButton
                    aria-label={t('stay.addExtraAction')}
                    onClick={() => onSelect({ id: stay.id, action: 'extras' })}
                    sx={{ width: 44, height: 44, color: 'accent.main' }}
                  >
                    <SvgIcon>
                      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
                    </SvgIcon>
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
            {(!stay.closure || stay.account.balanceMinor > 0) && (
              <Stack
                direction="row"
                spacing={0.5}
                sx={{
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                }}
              >
                <Typography
                  variant="h6"
                  component="span"
                  aria-label={`${t(stay.account.balanceMinor < 0 ? 'stay.credit' : 'stay.balance')}: ${formatMoney(Math.abs(stay.account.balanceMinor), stay.currency, i18n.language)}`}
                  sx={{
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color:
                      stay.account.balanceMinor < 0
                        ? 'success.light'
                        : stay.account.balanceMinor > 0
                          ? 'error.light'
                          : 'text.secondary',
                  }}
                >
                  {formatMoney(
                    Math.abs(stay.account.balanceMinor),
                    stay.currency,
                    i18n.language,
                  )}
                </Typography>
                <Tooltip title={t('stay.recordPayment')}>
                  <IconButton
                    aria-label={t('stay.recordPayment')}
                    onClick={() => onSelect({ id: stay.id, action: 'payment' })}
                    sx={{ width: 44, height: 44, color: 'accent.main' }}
                  >
                    <SvgIcon>
                      <g
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 18H3V5h18v7M3 9a4 4 0 0 0 4-4m10 0a4 4 0 0 0 4 4M3 14a4 4 0 0 1 4 4" />
                        <circle cx="12" cy="11.5" r="2.5" />
                        <path d="M18 15v6m-3-3h6" />
                      </g>
                    </SvgIcon>
                  </IconButton>
                </Tooltip>
              </Stack>
            )}
            {!stay.closure && (
              <Tooltip title={t('stay.closeTitle')}>
                <IconButton
                  aria-label={t('stay.closeTitle')}
                  onClick={() => onSelect({ id: stay.id, action: 'close' })}
                  sx={{
                    width: 44,
                    height: 44,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                >
                  <SvgIcon>
                    <g
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10 4H4v16h6M4 4l7-2v20l-7-2M14 12h8m-3-3 3 3-3 3" />
                      <path d="M8 12h.01" />
                    </g>
                  </SvgIcon>
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </ListItem>
      ))}
    </List>
  )
}
