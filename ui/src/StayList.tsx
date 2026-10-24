import { useTranslation } from 'react-i18next'
import {
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import { CircleDollarSign, LogOut, Plus } from 'lucide-react'
import type { ReservationResponse, Stay } from '@camping/contracts'
import LucideIcon from './components/LucideIcon'
import AccommodationIdentity from './AccommodationIdentity'
import { buildAccommodationIdentity } from './services/accommodationIdentity'
import { todayInTimezone } from './checkIn/schema'
import { relativeDay } from './services/relativeDay'
import { formatMoney } from './services/money'

export type StayAction = 'detail' | 'payment' | 'close' | 'extras'
export type StaySelection = { id: string; action: StayAction }

type Props = {
  items: Stay[]
  timezone: string
  onSelect: (selection: StaySelection) => void
  typeNames?: Map<string, string>
  typeModes?: Map<string, string>
  unitNames?: Map<string, string>
  reservationsById?: Map<string, ReservationResponse>
}

export default function StayList({
  items,
  timezone,
  onSelect,
  typeNames,
  typeModes,
  unitNames,
  reservationsById,
}: Props) {
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
      {items.map((stay) => {
        const reservation = stay.reservationId
          ? reservationsById?.get(stay.reservationId)
          : undefined
        const identity = buildAccommodationIdentity({
          reservation,
          hasReservation: Boolean(stay.reservationId),
          location: stay.location,
          typeNames,
          typeModes,
          unitNames,
          labels: {
            accommodation: t('home.accommodation'),
            freeCamping: t('home.freeCamping'),
            unknownUnit: t('home.unknownUnit'),
          },
        })
        return (
          <ListItem
            key={stay.id}
            disablePadding
            divider
            sx={{
              alignItems: 'stretch',
              flexDirection: { xs: 'column', md: 'row' },
            }}
          >
            <ListItemButton
              onClick={() => onSelect({ id: stay.id, action: 'detail' })}
              sx={{ minWidth: 0, borderRadius: 1 }}
            >
              <ListItemText
                primary={stay.responsibleName}
                secondary={
                  <AccommodationIdentity
                    identity={identity}
                    meta={relativeDay(stay.arrivalDate, today, i18n.language)}
                    people={stay.adults + stay.children + stay.infants}
                  />
                }
                slotProps={{
                  primary: {
                    sx: { fontWeight: 700, overflowWrap: 'anywhere' },
                  },
                  secondary: {
                    component: 'div',
                    sx: { overflowWrap: 'anywhere' },
                  },
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
                  xs: 'minmax(0, 1fr) 44px',
                  sm: 'minmax(0, 1fr) minmax(0, 1.3fr) 44px',
                  md: '128px 132px 44px',
                },
                columnGap: { xs: 1, md: 6 },
                rowGap: 1,
                width: { xs: '100%', md: 'auto' },
                alignItems: 'center',
                pr: 1,
                pl: { xs: 2, md: 0 },
                pb: { xs: 1, md: 0 },
                justifyContent: 'flex-end',
                flexShrink: 0,
              }}
            >
              <Stack
                direction="row"
                spacing={0.5}
                sx={{
                  alignItems: 'center',
                  justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                  gridColumn: { xs: '1 / -1', sm: 'auto' },
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
                      onClick={() =>
                        onSelect({ id: stay.id, action: 'extras' })
                      }
                      sx={{
                        width: 44,
                        height: 44,
                        flexShrink: 0,
                        color: 'accent.main',
                      }}
                    >
                      <LucideIcon icon={Plus} />
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
                      overflowWrap: 'anywhere',
                      minWidth: 0,
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
                      onClick={() =>
                        onSelect({ id: stay.id, action: 'payment' })
                      }
                      sx={{
                        width: 44,
                        height: 44,
                        flexShrink: 0,
                        color: 'accent.main',
                      }}
                    >
                      <LucideIcon icon={CircleDollarSign} />
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
                    <LucideIcon icon={LogOut} />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </ListItem>
        )
      })}
    </List>
  )
}
