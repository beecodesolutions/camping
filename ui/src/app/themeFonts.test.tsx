import { renderToStaticMarkup } from 'react-dom/server'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { expect, it } from 'vitest'
import { darkTheme, lightTheme } from './theme'

it.each([lightTheme, darkTheme])(
  'registers both self-hosted fonts in $palette.mode mode',
  (theme) => {
    const markup = renderToStaticMarkup(
      <ThemeProvider theme={theme}>
        <CssBaseline />
      </ThemeProvider>,
    )
    expect(markup.match(/@font-face/g)).toHaveLength(2)
    expect(markup).toContain('/fonts/source-sans-3-latin-variable.woff2')
    expect(markup).toContain('/fonts/source-serif-4-latin-variable.woff2')
    expect(markup).toContain('font-display:swap')
  },
)
