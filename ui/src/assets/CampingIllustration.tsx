import { Box } from '@mui/material'

export default function CampingIllustration() {
  return (
    <Box
      component="svg"
      viewBox="0 0 280 180"
      aria-hidden="true"
      focusable="false"
      sx={{
        width: { xs: 72, sm: 100 },
        height: 'auto',
        flexShrink: 0,
        color: 'primary.main',
      }}
    >
      <Box
        component="circle"
        cx="220"
        cy="35"
        r="18"
        sx={(theme) => ({ fill: theme.palette.secondary.light })}
      />
      <path
        d="M12 145 85 42l59 80 35-49 88 72Z"
        fill="currentColor"
        opacity="0.22"
      />
      <path d="m67 67 18-25 19 26-20-7Z" fill="currentColor" opacity="0.6" />
      <g fill="currentColor">
        <path d="m44 72-23 40h12l-21 32h64l-22-32h13Z" />
        <path d="m231 79-19 34h10l-18 30h54l-18-30h10Z" />
      </g>
      <path
        d="M44 141v17m187-18v18M15 160h250"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <Box
        component="path"
        d="m84 155 49-77h31l47 77Z"
        sx={(theme) => ({ fill: theme.palette.secondary.main })}
      />
      <Box
        component="path"
        d="m84 155 49-77 49 77Z"
        sx={(theme) => ({ fill: theme.palette.secondary.light })}
      />
      <Box
        component="path"
        d="m112 155 21-44 22 44Z"
        sx={(theme) => ({ fill: theme.palette.primary.dark })}
      />
      <path
        d="m133 78 49 77m-49-77-49 77"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Box>
  )
}
