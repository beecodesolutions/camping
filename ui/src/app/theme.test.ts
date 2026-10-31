import { operationalFont, typography } from './theme/typography'
import { describe, expect, it } from 'vitest'
import { getContrastRatio } from '@mui/material/styles'
import {
  checkoutActionStyles,
  darkTheme,
  editorialFont,
  lightTheme,
} from './theme'

describe.each([lightTheme, darkTheme])('Maytu $palette.mode theme', (theme) => {
  it('keeps readable text, actions, statuses and wine accents', () => {
    const { palette } = theme
    for (const background of [
      palette.background.default,
      palette.background.paper,
    ]) {
      for (const foreground of [
        palette.text.primary,
        palette.text.secondary,
        palette.accent.main,
        palette.success.main,
        palette.warning.main,
        palette.error.main,
        palette.info.main,
      ]) {
        expect(getContrastRatio(foreground, background)).toBeGreaterThanOrEqual(
          4.5,
        )
      }
    }
    for (const color of [palette.primary, palette.secondary]) {
      expect(
        getContrastRatio(color.main, color.contrastText),
      ).toBeGreaterThanOrEqual(4.5)
    }
    expect(
      getContrastRatio(
        palette.navigation.main,
        palette.navigation.contrastText,
      ),
    ).toBeGreaterThanOrEqual(4.5)
    expect(palette.accent.main).not.toBe(palette.error.main)
  })

  it('limits serif typography to editorial headings', () => {
    expect(theme.typography.h4.fontFamily).toBe(editorialFont)
    expect(theme.typography.h6.fontFamily).not.toBe(editorialFont)
    expect(theme.typography.button.fontFamily).not.toBe(editorialFont)
    expect(theme.shape.borderRadius).toBe(8)
  })
})

it('defines a family and size for every typography variant', () => {
  for (const [name, definition] of Object.entries(typography)) {
    if (name === 'fontFamily') continue
    expect(definition).toHaveProperty('fontFamily')
    expect(definition).toHaveProperty('fontSize')
  }
  for (const theme of [lightTheme, darkTheme]) {
    for (const variant of [
      'metric',
      'metricLarge',
      'metricSmall',
      'metricSecondary',
    ] as const) {
      expect(theme.typography[variant].fontFamily).toBe(operationalFont)
      expect(theme.typography[variant].fontVariantNumeric).toBe('tabular-nums')
    }
  }
})

it.each([lightTheme, darkTheme])(
  'keeps checkout icons readable in $palette.mode mode, including hover',
  (theme) => {
    const styles = checkoutActionStyles(theme)
    expect(
      getContrastRatio(styles.color, styles.bgcolor),
    ).toBeGreaterThanOrEqual(4.5)
    expect(
      getContrastRatio(styles['&:hover'].color, styles['&:hover'].bgcolor),
    ).toBeGreaterThanOrEqual(4.5)
  },
)
