import { uiProps } from './theme/layout'
import { uiStyles } from './theme/styles'
import { illustrationColors } from './theme/visuals'
import { alpha, createTheme } from '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Theme {
    ui: typeof uiStyles
    layout: typeof uiProps
    illustration: typeof illustrationColors
  }
  interface ThemeOptions {
    ui?: typeof uiStyles
    layout?: typeof uiProps
    illustration?: typeof illustrationColors
  }
  interface Palette {
    navigation: { main: string; contrastText: string; selected: string }
    accent: { main: string; light: string }
    selection: { main: string }
  }
  interface PaletteOptions {
    navigation?: { main: string; contrastText: string; selected: string }
    accent?: { main: string; light: string }
    selection?: { main: string }
  }
}

export { editorialFont } from './theme/typography'
import { typography } from './theme/typography'

export const lightTheme = createTheme({
  ui: uiStyles,
  layout: uiProps,
  illustration: illustrationColors,
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
    navigation: {
      main: '#18382B',
      contrastText: '#F5E7D0',
      selected: '#FFFFFF1F',
    },
    accent: { main: '#963D5A', light: '#DDA5B6' },
    selection: { main: '#35644B' },
    background: { default: '#F6F1E8', paper: '#FFFDFA' },
    text: { primary: '#253C30', secondary: '#626D64', disabled: '#75796F' },
    divider: '#DFDACE',
    success: { main: '#35644B', light: '#4C7559', dark: '#244C3A' },
    warning: { main: '#806038', light: '#96703D', dark: '#674A28' },
    error: { main: '#B13D32', light: '#B13D32', dark: '#8F3028' },
    info: { main: '#3D6670', light: '#3D6670', dark: '#2D5058' },
    action: {
      hover: '#35644B0A',
      selected: '#35644B14',
      focus: '#35644B29',
      disabled: '#75796F',
      disabledBackground: '#E7E2D8',
    },
  },
  typography,
  spacing: 8,
  shape: { borderRadius: 8 },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        '*:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 3,
        },
      }),
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: 'none',
          border: `1px solid ${theme.palette.divider}`,
        }),
      },
    },
    MuiCard: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiTextField: { defaultProps: { size: 'small', variant: 'outlined' } },
    MuiFormControl: { defaultProps: { size: 'small' } },
    MuiOutlinedInput: { styleOverrides: { root: { minHeight: 44 } } },
    MuiIconButton: {
      styleOverrides: { root: { minWidth: 44, minHeight: 44 } },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none', minHeight: 44, fontWeight: 600 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: '12px 16px',
          borderColor: theme.palette.divider,
          fontVariantNumeric: 'tabular-nums',
        }),
        head: ({ theme }) => ({
          backgroundColor: theme.palette.action.hover,
          fontWeight: 700,
        }),
      },
    },
    MuiTableContainer: { styleOverrides: { root: { overflowX: 'auto' } } },
    MuiChip: {
      defaultProps: { size: 'small' },
      styleOverrides: { root: { borderRadius: 6, fontWeight: 600 } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&:hover': { backgroundColor: theme.palette.action.hover },
          '&.Mui-selected': { backgroundColor: theme.palette.action.selected },
        }),
      },
    },
    MuiFab: {
      styleOverrides: { root: { borderRadius: 8, boxShadow: 'none' } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: 'none',
          borderRadius: 6,
          minHeight: 44,
          '&.Mui-focusVisible': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 3,
          },
        }),
      },
    },
  },
})

export const darkTheme = createTheme({
  ui: uiStyles,
  layout: uiProps,
  illustration: illustrationColors,
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
      contrastText: '#253C30',
    },
    navigation: lightTheme.palette.navigation,
    accent: { ...lightTheme.palette.accent, main: '#E86684' },
    selection: { main: '#A9C3AC' },
    background: { default: '#211E1A', paper: '#2C2823' },
    text: { primary: '#F3EDE3', secondary: '#C4BBAE', disabled: '#9D9589' },
    divider: '#51493F',
    success: { main: '#A9C3AC', light: '#A9C3AC', dark: '#7FA98C' },
    warning: { main: '#DDB575', light: '#DDB575', dark: '#BE9658' },
    error: { main: '#F39B90', light: '#F39B90', dark: '#D97E74' },
    info: { main: '#9FC6D0', light: '#9FC6D0', dark: '#7BA8B3' },
    action: {
      hover: alpha('#F5E7D0', 0.06),
      selected: alpha('#A9C3AC', 0.16),
      focus: alpha('#DDB575', 0.24),
      disabled: '#9D9589',
      disabledBackground: '#413A31',
    },
  },
})

export {
  availabilityTone,
  callingCodePopperProps,
  checkoutActionStyles,
  lucideIconStyles,
  uiStyles,
} from './theme/styles'

export { uiProps } from './theme/layout'

export { occupancyChartProps } from './theme/visuals'
