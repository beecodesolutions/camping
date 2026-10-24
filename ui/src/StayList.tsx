import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material'
import {
  Banknote,
  EllipsisVertical,
  LogOut,
  ShoppingBasket,
} from 'lucide-react'
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
  const menuId = useId()
  const [menu, setMenu] = useState<{
    anchor: HTMLElement
    stayId: string
  } | null>(null)
  const menuStay = items.find((stay) => stay.id === menu?.stayId)
  const chooseAction = (action: 'extras' | 'payment') => {
    if (!menuStay) return
    setMenu(null)
    onSelect({ id: menuStay.id, action })
  }
  if (!items.length)
    return (
      <Typography color="text.secondary" sx={{ p: 2 }}>
        {t('home.noStays')}
      </Typography>
    )
  return (
    <>
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
                '&:last-child': { borderBottom: 0 },
                alignItems: { xs: 'center', sm: 'stretch' },
                flexDirection: { xs: 'row', sm: 'column', md: 'row' },
              }}
            >
              <ListItemButton
                onClick={() => onSelect({ id: stay.id, action: 'detail' })}
                sx={{
                  minWidth: 0,
                  flex: 1,
                  borderRadius: 1,
                  px: { xs: 0, sm: 2 },
                }}
              >
                <ListItemText
                  primary={stay.responsibleName}
                  secondary={
                    <AccommodationIdentity
                      identity={identity}
                      compactMobile
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
                  <Typography
                    variant="body2"
                    sx={{
                      ml: 2,
                      flexShrink: 0,
                      display: { xs: 'none', sm: 'block' },
                    }}
                  >
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
                  display: { xs: 'flex', sm: 'grid' },
                  flexDirection: 'row',
                  gridTemplateColumns: {
                    xs: 'minmax(0, 1fr) 44px',
                    sm: 'minmax(0, 1fr) minmax(0, 1.3fr) 44px 44px',
                    md: '100px 132px 44px 44px',
                  },
                  columnGap: { xs: 0.5, sm: 1, md: 3 },
                  rowGap: 1,
                  width: { xs: 'auto', sm: '100%', md: 'auto' },
                  alignItems: 'center',
                  pr: { xs: 0, sm: 1 },
                  pl: { xs: 0, sm: 2, md: 0 },
                  pb: { xs: 0, sm: 1, md: 0 },
                  justifyContent: 'flex-end',
                  flexShrink: 0,
                }}
              >
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{
                    alignItems: 'center',
                    display: { xs: 'none', sm: 'flex' },
                    justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                    gridColumn: { xs: '1 / -1', sm: 'auto' },
                    minWidth: 0,
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ display: { xs: 'none', sm: 'block' } }}
                  >
                    {stay.extras.length > 0
                      ? t('stay.extrasCount', { count: stay.extras.length })
                      : t('stay.noExtrasLabel')}
                  </Typography>
                </Stack>
                {(!stay.closure || stay.account.balanceMinor > 0) && (
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      display: { xs: 'none', sm: 'flex' },
                    }}
                  >
                    <Typography
                      variant="h6"
                      component="span"
                      aria-label={`${t(stay.account.balanceMinor < 0 ? 'stay.credit' : 'stay.balance')}: ${formatMoney(Math.abs(stay.account.balanceMinor), stay.currency, i18n.language)}`}
                      sx={{
                        display: { xs: 'none', sm: 'inline' },
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
                  </Stack>
                )}
                {(!stay.closure || stay.account.balanceMinor > 0) && (
                  <Tooltip title={t('stay.moreActions')}>
                    <IconButton
                      id={`${menuId}-${stay.id}-button`}
                      aria-label={`${t('stay.moreActions')}: ${stay.responsibleName}`}
                      aria-haspopup="menu"
                      aria-controls={
                        menu?.stayId === stay.id ? menuId : undefined
                      }
                      aria-expanded={
                        menu?.stayId === stay.id ? true : undefined
                      }
                      onClick={(event) =>
                        setMenu({
                          anchor: event.currentTarget,
                          stayId: stay.id,
                        })
                      }
                      sx={{
                        width: 44,
                        height: 44,
                        flexShrink: 0,
                        color: 'text.secondary',
                      }}
                    >
                      <LucideIcon icon={EllipsisVertical} />
                    </IconButton>
                  </Tooltip>
                )}
                {!stay.closure && (
                  <Tooltip title={t('stay.closeTitle')}>
                    <IconButton
                      aria-label={t('stay.closeTitle')}
                      onClick={() => onSelect({ id: stay.id, action: 'close' })}
                      sx={(theme) => {
                        const palette = theme.palette.warning
                        const background =
                          theme.palette.mode === 'dark'
                            ? palette.light
                            : palette.dark
                        return {
                          width: 44,
                          height: 44,
                          bgcolor: background,
                          color: theme.palette.getContrastText(background),
                          '&:hover': { bgcolor: palette.main },
                        }
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
      <Menu
        id={menuId}
        anchorEl={menu?.anchor ?? null}
        open={Boolean(menu && menuStay)}
        onClose={() => setMenu(null)}
        slotProps={{
          list: {
            'aria-labelledby': menuStay
              ? `${menuId}-${menuStay.id}-button`
              : undefined,
          },
        }}
      >
        {menuStay && !menuStay.closure && (
          <MenuItem onClick={() => chooseAction('extras')}>
            <ListItemIcon>
              <LucideIcon icon={ShoppingBasket} />
            </ListItemIcon>
            <ListItemText>{t('stay.addExtraAction')}</ListItemText>
          </MenuItem>
        )}
        {menuStay &&
          (!menuStay.closure || menuStay.account.balanceMinor > 0) && (
            <MenuItem onClick={() => chooseAction('payment')}>
              <ListItemIcon>
                <LucideIcon icon={Banknote} />
              </ListItemIcon>
              <ListItemText>{t('stay.recordPayment')}</ListItemText>
            </MenuItem>
          )}
      </Menu>
    </>
  )
}
