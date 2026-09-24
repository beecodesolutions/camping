import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  SvgIcon,
  Typography,
} from '@mui/material'

export type WorkspaceSection = 'home' | 'stays' | 'settings'
const sections = ['home', 'stays', 'settings'] as const

type Props = {
  section: WorkspaceSection
  onNavigate: (section: WorkspaceSection) => void
  onCheckIn: () => void
  checkInDisabled: boolean
  userName: string
  onLogout: () => void
  logoutPending: boolean
  themeControl: ReactNode
}

export default function WorkspaceNavigation({
  section,
  onNavigate,
  onCheckIn,
  checkInDisabled,
  userName,
  onLogout,
  logoutPending,
  themeControl,
}: Props) {
  const { t } = useTranslation()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  return (
    <Box
      component="header"
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        mb: 3,
      }}
    >
      <Stack
        direction="row"
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 2, sm: 3 },
          py: 1,
          gap: 1,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Box
          component="nav"
          aria-label={t('home.sections')}
          sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5 }}
        >
          {sections.map((value) => (
            <Button
              key={value}
              aria-current={section === value ? 'page' : undefined}
              onClick={() => onNavigate(value)}
              sx={{
                bgcolor: section === value ? 'action.selected' : undefined,
                color: section === value ? 'primary.main' : 'text.secondary',
              }}
            >
              {t(`navigation.${value}`)}
            </Button>
          ))}
        </Box>
        <IconButton
          aria-label={t('navigation.menu')}
          aria-haspopup="menu"
          aria-controls={anchor ? 'workspace-menu' : undefined}
          aria-expanded={Boolean(anchor)}
          onClick={(event) => setAnchor(event.currentTarget)}
          sx={{ display: { xs: 'inline-flex', md: 'none' } }}
        >
          <SvgIcon>
            <path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" />
          </SvgIcon>
        </IconButton>
        <Menu
          id="workspace-menu"
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={() => setAnchor(null)}
        >
          {sections.map((value) => (
            <MenuItem
              key={value}
              selected={section === value}
              aria-current={section === value ? 'page' : undefined}
              onClick={() => {
                onNavigate(value)
                setAnchor(null)
              }}
            >
              {t(`navigation.${value}`)}
            </MenuItem>
          ))}
        </Menu>
        <Button
          variant="contained"
          onClick={onCheckIn}
          disabled={checkInDisabled}
          sx={{
            flexShrink: 0,
            order: { xs: 2, sm: 0 },
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          {t('checkIn.register')}
        </Button>
        <Stack
          direction="row"
          sx={{ ml: 'auto', alignItems: 'center', minWidth: 0, gap: 0.5 }}
        >
          <Typography
            variant="body2"
            noWrap
            title={userName}
            sx={{ maxWidth: { xs: 100, sm: 140 } }}
          >
            {userName}
          </Typography>
          <Button
            size="small"
            onClick={onLogout}
            disabled={logoutPending}
            sx={{ flexShrink: 0 }}
          >
            {t('auth.logout')}
          </Button>
          {themeControl}
        </Stack>
      </Stack>
    </Box>
  )
}
