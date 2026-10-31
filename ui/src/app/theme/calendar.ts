import '@daypicker/react/style.css'
import { alpha, type Theme } from '@mui/material/styles'

/** DayPicker uses the same palette, typography and interaction states in both modes. */
export const dateRangeCalendar = (theme: Theme) => ({
  '& .rdp-root': {
    ...theme.typography.body2,
    '--rdp-accent-color': theme.palette.primary.main,
    '--rdp-accent-background-color': theme.palette.action.selected,
    '--rdp-range_middle-color': theme.palette.text.primary,
    '--rdp-range_start-color': theme.palette.primary.contrastText,
    '--rdp-range_end-color': theme.palette.primary.contrastText,
    '--rdp-today-color': theme.palette.text.primary,
    '--rdp-day-width': '100%',
    '--rdp-day-height': '44px',
    '--rdp-day_button-width': '100%',
    '--rdp-day_button-height': '44px',
    '--rdp-nav_button-width': '44px',
    '--rdp-nav_button-height': '44px',
    '--rdp-nav-height': '44px',
    '--rdp-disabled-opacity': 1,
    '--rdp-outside-opacity': 1,
    '--rdp-weekday-opacity': 1,
    width: '100%',
  },
  '& .rdp-months, & .rdp-month': { width: '100%', maxWidth: 'none' },
  '& .rdp-month_grid': { width: '100%', tableLayout: 'fixed' },
  '& .rdp-day_button, & .rdp-button_previous, & .rdp-button_next': {
    font: 'inherit',
    color: 'inherit',
    borderRadius: theme.shape.borderRadius,
    '&:hover:not(:disabled)': { backgroundColor: theme.palette.action.hover },
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: -2,
    },
  },
  '& .rdp-caption_label': { ...theme.typography.subtitle1 },
  '& .rdp-weekday': {
    ...theme.typography.caption,
    color: theme.palette.text.secondary,
  },
  '& .rdp-selected': { fontWeight: theme.typography.fontWeightBold },
  '& .rdp-range_start .rdp-day_button, & .rdp-range_end .rdp-day_button': {
    color: theme.palette.primary.contrastText,
    '&:hover:not(:disabled)': { backgroundColor: theme.palette.primary.dark },
  },
  '& .rdp-range_middle .rdp-day_button:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.2),
  },
  '& .rdp-disabled': { color: theme.palette.text.disabled },
  '& .rdp-outside:not(.rdp-selected)': { color: theme.palette.text.secondary },
})
