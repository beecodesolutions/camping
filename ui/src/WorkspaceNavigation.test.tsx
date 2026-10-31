import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ThemeProvider } from '@mui/material'
import WorkspaceNavigation from './WorkspaceNavigation'
import { lightTheme } from './app/theme'
import { i18nReady } from './app/i18n'

await i18nReady

it.each([
  ['home', 'Hoy'],
  ['stays', 'Estadías'],
  ['reservations', 'Reservas'],
  ['settings', 'Configuración'],
] as const)(
  'marks the destination for %s and exposes four links',
  (section, label) => {
    const markup = renderToStaticMarkup(
      <ThemeProvider theme={lightTheme}>
        <WorkspaceNavigation section={section} />
      </ThemeProvider>,
    )
    const links = markup.match(/<a\b[^>]*>[\s\S]*?<\/a>/g) ?? []
    expect(links).toHaveLength(4)
    const current = links.filter((link) => link.includes('aria-current="page"'))
    expect(current).toHaveLength(1)
    expect(current[0]).toContain(label)
    expect(links.map((link) => link.match(/href="([^"]+)"/)?.[1])).toEqual([
      '/hoy',
      '/estadias',
      '/reservas',
      '/configuracion',
    ])
    expect(markup).not.toContain('Registrar ingreso')
    expect(markup).not.toContain('Cerrar sesión')
  },
)
