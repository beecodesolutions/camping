import type { ReactNode } from 'react'
import { Box, Stack } from '@mui/material'

type Props = {
  header: ReactNode
  notices?: ReactNode
  children: ReactNode
}

export default function WorkspaceLayout({ header, notices, children }: Props) {
  return (
    <Box
      id="workspace-scroll"
      sx={{
        position: { md: 'fixed' },
        top: { md: 72 },
        bottom: { md: 0 },
        left: { md: 0 },
        right: { md: 0 },
        overflowY: { md: 'auto' },
      }}
    >
      <Box
        component="main"
        sx={{
          maxWidth: 980,
          mx: 'auto',
          px: { xs: 2, sm: 3 },
          pt: { xs: 3, md: 5 },
          pb: { xs: 'calc(160px + env(safe-area-inset-bottom))', md: 4 },
        }}
      >
        <Stack spacing={3}>
          {notices}
          {header}
          <Box sx={{ minWidth: 0 }}>{children}</Box>
        </Stack>
      </Box>
    </Box>
  )
}
