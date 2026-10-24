import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ThemeProvider } from '@mui/material'
import { WalletCards } from 'lucide-react'
import { lightTheme } from '../app/theme'
import LucideIcon from './LucideIcon'

it('renders a themed Lucide icon as one outlined SVG', () => {
  const markup = renderToStaticMarkup(
    <ThemeProvider theme={lightTheme}>
      <LucideIcon
        icon={WalletCards}
        color="primary"
        fontSize="small"
        sx={{ color: 'secondary.dark' }}
      />
    </ThemeProvider>,
  )

  expect(markup.match(/<svg\b/g)).toHaveLength(1)
  expect(markup).toContain('fill="none"')
  expect(markup).toContain('stroke="currentColor"')
  expect(markup).toContain('viewBox="0 0 24 24"')
})
