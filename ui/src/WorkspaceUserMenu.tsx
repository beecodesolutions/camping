import { useId, useState } from 'react'
import {
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material'
import { LogOut, Moon, Sun, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import LucideIcon from './components/LucideIcon'

type Props = {
  onLogout: () => void
  logoutPending: boolean
  themeMode: 'light' | 'dark'
  onToggleTheme: () => void
}

export default function WorkspaceUserMenu({
  onLogout,
  logoutPending,
  themeMode,
  onToggleTheme,
}: Props) {
  const { t } = useTranslation()
  const menuId = useId()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  return (
    <>
      <Tooltip title={t('navigation.account')}>
        <IconButton
          aria-label={t('navigation.account')}
          aria-haspopup="menu"
          aria-expanded={Boolean(anchor)}
          aria-controls={anchor ? menuId : undefined}
          onClick={(event) => setAnchor(event.currentTarget)}
        >
          <LucideIcon icon={UserRound} />
        </IconButton>
      </Tooltip>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            onToggleTheme()
            setAnchor(null)
          }}
        >
          <ListItemIcon>
            <LucideIcon icon={themeMode === 'dark' ? Sun : Moon} />
          </ListItemIcon>
          {t(themeMode === 'dark' ? 'common.lightTheme' : 'common.darkTheme')}
        </MenuItem>
        <MenuItem
          disabled={logoutPending}
          onClick={() => {
            setAnchor(null)
            onLogout()
          }}
        >
          <ListItemIcon>
            <LucideIcon icon={LogOut} />
          </ListItemIcon>
          {t('auth.logout')}
        </MenuItem>
      </Menu>
    </>
  )
}
