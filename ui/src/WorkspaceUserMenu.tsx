import { useState } from 'react'
import {
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material'
import { LogOut, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import LucideIcon from './components/LucideIcon'

type Props = {
  onLogout: () => void
  logoutPending: boolean
}

export default function WorkspaceUserMenu({ onLogout, logoutPending }: Props) {
  const { t } = useTranslation()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  return (
    <>
      <Tooltip title={t('navigation.account')}>
        <IconButton
          aria-label={t('navigation.account')}
          aria-haspopup="menu"
          aria-expanded={Boolean(anchor)}
          aria-controls={anchor ? 'workspace-user-menu' : undefined}
          onClick={(event) => setAnchor(event.currentTarget)}
        >
          <LucideIcon icon={UserRound} />
        </IconButton>
      </Tooltip>
      <Menu
        id="workspace-user-menu"
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
      >
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
