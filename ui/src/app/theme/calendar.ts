import '@daypicker/react/style.css'
import { alpha, type Theme } from '@mui/material/styles'

/** DayPicker uses the same palette, typography and interaction states in both modes. */
export const dateRangeCalendar = (theme: Theme) => ({
  '& .rdp-root': {
    ...theme.typography.body2,
    '--rdp-accent-color': theme.palette.primary.main,
    '--rdp-accent-background-color': theme.palette.action.selected,
    '--rdp-range_middle-color': theme.palette.text.primary,
    '--rdp-range_start-color': theme.palette.text.primary,
    '--rdp-range_start-date-background-color': 'transparent',
    '--rdp-range_end-color': theme.palette.text.primary,
    '--rdp-range_end-date-background-color': 'transparent',
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
    position: 'relative',
    font: 'inherit',
    color: 'inherit',
    borderRadius: `${theme.shape.borderRadius}px`,
    '&:hover:not(:disabled)': { backgroundColor: theme.palette.action.hover },
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: -2,
    },
  },
  '& .rdp-today .rdp-day_button::after': {
    content: '""',
    position: 'absolute',
    top: 3,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 4,
    height: 4,
    borderRadius: '50%',
    backgroundColor: theme.palette.selection.main,
  },
  '& .rdp-caption_label': { ...theme.typography.subtitle1 },
  '& .rdp-weekday': {
    ...theme.typography.caption,
    color: theme.palette.text.secondary,
  },
  '& .rdp-selected': { fontWeight: theme.typography.fontWeightBold },
  '& .rdp-selected:not(.rdp-range_middle) .rdp-day_button': {
    border: `3px solid ${theme.palette.selection.main}`,
    color: 'inherit',
    '&:hover:not(:disabled)': {
      backgroundColor: theme.palette.action.selected,
    },
  },
  '& .rdp-range_middle .rdp-day_button': {
    boxShadow: `inset 0 -3px 0 ${theme.palette.selection.main}`,
    '&:hover:not(:disabled)': {
      backgroundColor: alpha(theme.palette.primary.main, 0.2),
    },
  },
  '& .rdp-disabled': { color: theme.palette.text.disabled },
  '& .rdp-disabled .rdp-day_button': { opacity: 0.55 },
  '& .rdp-outside:not(.rdp-selected)': { color: theme.palette.text.secondary },
})
