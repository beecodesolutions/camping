import { uiProps, uiStyles } from './app/theme'
import { scrollWorkspaceToTop } from './app/workspaceScroll'
import { useEffect, useState, type ReactNode } from 'react'
import { BedDouble, CalendarDays, Settings, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Box, Button, Paper, Stack } from '@mui/material'
import MaytuBrand from './components/MaytuBrand'
import LucideIcon from './components/LucideIcon'
import { workspaceHref, type WorkspaceSection } from './app/workspaceLocation'

type Props = {
  section: WorkspaceSection
  controls?: ReactNode
}

const destinations = [
  { section: 'home', icon: Sun },
  { section: 'stays', icon: BedDouble },
  { section: 'reservations', icon: CalendarDays },
  { section: 'settings', icon: Settings },
] as const

export default function WorkspaceNavigation({ section, controls }: Props) {
  const { t } = useTranslation()
  const activeSection = section
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
      sx={uiStyles.navigationBar(barVisible)}
    >
      <Box sx={uiStyles.desktopBrand}>
        <MaytuBrand inverse />
      </Box>
      <Stack
        {...uiProps.navigationRow}

        sx={uiStyles.flexGrow}
      >
        {destinations.map(({ section: value, icon }) => (
          <Button
            key={value}
            href={workspaceHref(value)}
            aria-label={t(`navigation.${value}`)}
            title={value === 'settings' ? t('navigation.settings') : undefined}
            onClick={() => scrollWorkspaceToTop()}
            aria-current={activeSection === value ? 'page' : undefined}
            sx={uiStyles.navigationItem(value, activeSection)}
          >
            <LucideIcon icon={icon} />
            <Box component="span" sx={uiStyles.navigationLabel(value)}>
              {t(`navigation.${value}`)}
            </Box>
          </Button>
        ))}
      </Stack>
      <Stack
        {...uiProps.rowSmall}

        sx={uiStyles.workspaceNavigationStack2}
      >
        {controls}
      </Stack>
    </Paper>
  )
}
