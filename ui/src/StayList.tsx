import { useTranslation } from 'react-i18next'
import {
  Box,
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
import type { ReservationResponse, Stay } from '@camping/contracts'
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
        const accommodation = reservation
          ? (() => {
              const typeName =
                typeNames?.get(reservation.accommodationTypeId) ??
                t('home.accommodation')
              const unitName = reservation.unitId
                ? (unitNames?.get(reservation.unitId) ?? t('home.unknownUnit'))
                : t('home.freeCamping')
              return typeName === unitName
                ? typeName
                : `${typeName} · ${unitName}`
            })()
          : stay.reservationId
            ? t('home.accommodation')
            : stay.location
              ? `${t('home.freeCamping')} · ${stay.location}`
              : t('home.freeCamping')
        const iconKind = reservation
          ? reservation.unitId ||
            typeModes?.get(reservation.accommodationTypeId) === 'individual'
            ? 'bed'
            : 'tent'
          : stay.reservationId
            ? 'neutral'
            : 'tent'
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
                  <Stack
                    component="span"
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                  >
                    <SvgIcon
                      aria-hidden="true"
                      focusable="false"
                      sx={{ fontSize: 18, color: 'text.secondary' }}
                    >
                      {iconKind === 'bed' ? (
                        <path d="M3 18v-7h2v3h5V9h6a5 5 0 0 1 5 5v4h-2v-2H5v2H3Zm4-6h3V9H7v3Zm5 0h7a3 3 0 0 0-3-3h-4v3Z" />
                      ) : iconKind === 'tent' ? (
                        <path d="m2 20 5.8-11.6a4.7 4.7 0 0 1 8.4 0L22 20h-2.2l-1.5-3H5.7l-1.5 3H2Zm4.7-5h6.6L10 8.4 6.7 15Zm5 0h3.6l-1.8-3.6-1.8 3.6Z" />
                      ) : (
                        <path d="M5 4h14v16H5V4Zm3 3v2h2V7H8Zm6 0v2h2V7h-2ZM8 12v2h2v-2H8Zm6 0v2h2v-2h-2Zm-6 4v2h2v-2H8Zm6 0v2h2v-2h-2Z" />
                      )}
                    </SvgIcon>
                    <Box component="span">{accommodation}</Box>
                    <Box component="span">
                      · {relativeDay(stay.arrivalDate, today, i18n.language)} ·{' '}
                      {t('stay.peopleCount', {
                        count: stay.adults + stay.children + stay.infants,
                      })}
                    </Box>
                  </Stack>
                }
                slotProps={{
                  primary: {
                    sx: { fontWeight: 600, overflowWrap: 'anywhere' },
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
        )
      })}
    </List>
  )
}
