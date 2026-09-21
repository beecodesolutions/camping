import { createTheme } from '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Palette {
    accent: { main: string; light: string }
  }
  interface PaletteOptions {
    accent?: { main: string; light: string }
  }
}

export const lightTheme = createTheme({
  palette: {
    primary: {
      main: '#35644B',
      dark: '#244C3A',
      light: '#A9C3AC',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#DDB575',
      light: '#F5E7D0',
      dark: '#806038',
      contrastText: '#253C30',
    },
    accent: { main: '#963D5A', light: '#DDA5B6' },
    background: { default: '#EDF2EF', paper: '#FFFFFF' },
    text: { primary: '#253C30', secondary: '#626D64' },
    divider: '#E1E5DB',
  },
  typography: {
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { textTransform: 'none' } },
    },
  },
})

export const darkTheme = createTheme({
  typography: lightTheme.typography,
  shape: lightTheme.shape,
  components: lightTheme.components,
  palette: {
    mode: 'dark',
    primary: {
      main: '#A9C3AC',
      dark: '#7FA98C',
      light: '#CEE0D0',
      contrastText: '#17251D',
    },
    secondary: {
      main: '#DDB575',
      light: '#342D22',
      dark: '#DDB575',
      contrastText: '#F5E7D0',
    },
    accent: { ...lightTheme.palette.accent, main: '#E86684' },
    background: { default: '#141C17', paper: '#1E2922' },
    text: { primary: '#E5EDE5', secondary: '#B2BEB3' },
    divider: '#3B4B3F',
  },
})
