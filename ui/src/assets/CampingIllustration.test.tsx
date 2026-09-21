import { afterEach, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ThemeProvider } from '@mui/material'
import { darkTheme, lightTheme } from '../app/theme'
import CampingIllustration from './CampingIllustration'

afterEach(() => vi.restoreAllMocks())

it('pliega la carpa de techo de día y la despliega de noche', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.25)
  const render = (theme: typeof lightTheme) =>
    renderToStaticMarkup(
      <ThemeProvider theme={theme}>
        <CampingIllustration />
      </ThemeProvider>,
    )
  const day = render(lightTheme)
  const night = render(darkTheme)
  // Roof case is a shallow rectangle; deployed canvas is a wedge.
  expect(day).toContain('width="79" height="6"')
  expect(day).not.toContain('d="M87 99 111 56 177 99Z"')
  expect(night).not.toContain('width="79" height="6"')
  expect(night).toContain('d="M87 99 111 56 177 99Z"')
})

it('también puede elegir la carpa de suelo', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.75)
  const markup = renderToStaticMarkup(
    <ThemeProvider theme={lightTheme}>
      <CampingIllustration />
    </ThemeProvider>,
  )
  expect(markup).toContain('d="m84 155 49-77h31l47 77Z"')
  expect(markup).not.toContain('cx="108" cy="147" r="12"')
})
