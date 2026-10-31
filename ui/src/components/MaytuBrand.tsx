import { Box, useTheme } from '@mui/material'
import { editorialFont } from '../app/theme'

// shortcut: provisional page mark, replace paths with approved SVG before brand release.
export default function MaytuBrand({ inverse = false }: { inverse?: boolean }) {
  const theme = useTheme()
  return (
    <Box
      role="img"
      aria-label="Maytu"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        color: inverse ? 'navigation.contrastText' : 'primary.main',
        whiteSpace: 'nowrap',
      }}
    >
      <Box
        component="svg"
        aria-hidden="true"
        viewBox="0 0 64 64"
        sx={{ width: 32, height: 32, flexShrink: 0 }}
      >
        <path
          fill="currentColor"
          d="M7 7C20 9 28 14 29 25v8C22 23 14 21 7 15ZM3 20c15 7 25 16 26 28v12C18 52 3 56 3 42Z"
        />
        <Box
          component="path"
          fill={theme.palette.secondary.main}
          d="M57 7C44 9 36 14 35 25v8c7-10 15-12 22-18Z"
        />
        <path
          fill="currentColor"
          d="M61 20C46 27 36 36 35 48v12c11-8 26-4 26-18Z"
        />
      </Box>
      <Box
        component="span"
        sx={{
          fontFamily: editorialFont,
          fontSize: '2rem',
          fontWeight: 700,
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}
      >
        maytu
      </Box>
    </Box>
  )
}
