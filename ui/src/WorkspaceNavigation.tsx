import { useEffect, useState } from 'react'
import { BedDouble, CalendarDays, Ellipsis, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { alpha, Box, Button, Paper, Stack, Typography } from '@mui/material'
import LucideIcon from './components/LucideIcon'
import { workspaceHref, type WorkspaceSection } from './app/workspaceLocation'

type Props = {
  section: WorkspaceSection
}

const destinations = [
  { section: 'home', icon: Sun },
  { section: 'stays', icon: BedDouble },
  { section: 'reservations', icon: CalendarDays },
  { section: 'more', icon: Ellipsis },
] as const

export default function WorkspaceNavigation({ section }: Props) {
  const { t } = useTranslation()
  const activeSection = section === 'settings' ? 'more' : section
  const [barVisible, setBarVisible] = useState(true)

  useEffect(() => {
    let previousY = window.scrollY
    let travel = 0
    const show = () => {
      travel = 0
      previousY = window.scrollY
      setBarVisible(true)
    }
    const onScroll = () => {
      const y = Math.max(0, window.scrollY)
      const delta = y - previousY
      previousY = y
      const atBottom =
        y + window.innerHeight >= document.documentElement.scrollHeight - 8
      if (
        y < 64 ||
        atBottom ||
        (document.activeElement?.closest('nav') &&
          document.activeElement.matches(':focus-visible'))
      ) {
        travel = 0
        setBarVisible(true)
        return
      }
      travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta
      if (Math.abs(travel) >= 24) {
        setBarVisible(travel < 0)
        travel = 0
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') show()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('hashchange', show)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('hashchange', show)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <Paper
      component="nav"
      aria-label={t('home.sections')}
      square
      elevation={0}
      sx={{
        position: 'fixed',
        zIndex: (theme) => theme.zIndex.appBar,
        bottom: { xs: 0, md: 'auto' },
        left: 0,
        right: 0,
        top: { md: 0 },
        height: { md: 72 },
        display: { md: 'flex' },
        alignItems: { md: 'center' },
        gap: { md: 4 },
        borderTop: { xs: 1, md: 0 },
        borderBottom: { md: 1 },
        borderColor: 'divider',
        pb: { xs: 'env(safe-area-inset-bottom)', md: 0 },
        px: { md: 3 },
        transform: {
          xs: barVisible ? 'translateY(0)' : 'translateY(100%)',
          md: 'none',
        },
        visibility: { xs: barVisible ? 'visible' : 'hidden', md: 'visible' },
        transition: barVisible
          ? 'transform 180ms ease-out'
          : 'transform 180ms ease-out, visibility 0s 180ms',
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}
    >
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          minWidth: 0,
          maxWidth: '35%',
        }}
      >
        <Typography noWrap sx={{ fontWeight: 700, color: 'primary.main' }}>
          Maytu
        </Typography>
      </Box>
      <Stack direction="row" spacing={{ md: 1 }} sx={{ flex: 1 }}>
        {destinations.map(({ section: value, icon }) => (
          <Button
            key={value}
            href={workspaceHref(value)}
            onClick={() =>
              window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
            }
            aria-current={activeSection === value ? 'page' : undefined}
            sx={{
              flex: { xs: 1, md: 'initial' },
              minWidth: 0,
              minHeight: { xs: 64, md: 72 },
              ml: { md: value === 'more' ? 'auto !important' : undefined },
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'center',
              gap: { xs: 0.5, md: 1.5 },
              px: { xs: 0.5, md: 1.5 },
              py: 1,
              borderRadius: 0,
              borderBottom: { md: '3px solid' },
              borderBottomColor: {
                md: activeSection === value ? 'accent.main' : 'transparent',
              },
              textTransform: 'none',
              bgcolor: (theme) =>
                activeSection === value
                  ? {
                      xs: alpha(theme.palette.accent.main, 0.12),
                      md: 'transparent',
                    }
                  : undefined,
              color: activeSection === value ? 'accent.main' : 'text.secondary',
              '&:hover': {
                bgcolor: (theme) => alpha(theme.palette.accent.main, 0.18),
                color: 'accent.main',
              },
              fontWeight: activeSection === value ? 700 : 500,
              fontSize: { xs: '0.75rem', md: '0.875rem' },
            }}
          >
            <LucideIcon icon={icon} />
            {t(`navigation.${value}`)}
          </Button>
        ))}
      </Stack>
    </Paper>
  )
}
