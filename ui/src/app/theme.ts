import { createTheme } from '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Palette {
    accent: { main: string; light: string }
  }
  interface PaletteOptions {
    accent?: { main: string; light: string }
  }
}

export const theme = createTheme({
  palette: {
    primary: {
      main: '#35644B',
      dark: '#244C3A',
      light: '#A9C3AC',
      contrastText: '#FFFFFF',
    },
    secondary: { main: '#DDB575', light: '#F2DFC0', dark: '#806038' },
    accent: { main: '#A65336', light: '#E5AC91' },
    background: { default: '#F4F1E8', paper: '#FFFFFF' },
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
