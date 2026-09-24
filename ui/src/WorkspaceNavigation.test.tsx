import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ThemeProvider } from '@mui/material'
import WorkspaceNavigation from './WorkspaceNavigation'
import { lightTheme } from './app/theme'
import { i18nReady } from './app/i18n'

await i18nReady

it.each(['home', 'stays', 'settings'] as const)(
  'marks %s as current and keeps check-in available',
  (section) => {
    const markup = renderToStaticMarkup(
      <ThemeProvider theme={lightTheme}>
        <WorkspaceNavigation
          section={section}
          onNavigate={() => {}}
          onCheckIn={() => {}}
          checkInDisabled={false}
          userName="Lucía"
          onLogout={() => {}}
          logoutPending={false}
          themeControl={null}
        />
      </ThemeProvider>,
    )
    const buttons = markup.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? []
    const current = buttons.filter((button) =>
      button.includes('aria-current="page"'),
    )
    expect(current).toHaveLength(1)
    expect(current[0]).toContain(
      { home: 'Inicio', stays: 'Estadías', settings: 'Configuración' }[section],
    )
    const checkIn = buttons.filter((button) =>
      button.includes('Registrar ingreso'),
    )
    expect(checkIn).toHaveLength(1)
    expect(checkIn[0]).not.toContain('disabled=""')
    expect(markup).toContain('Abrir navegación')
    expect(markup).toContain('Cerrar sesión')
  },
)
