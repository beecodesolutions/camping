import { describe, expect, it } from 'vitest'
import { getContrastRatio } from '@mui/material/styles'
import { darkTheme, editorialFont, lightTheme } from './theme'

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
