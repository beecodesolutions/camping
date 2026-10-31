import { uiProps, uiStyles } from './app/theme'
import type { ReactNode } from 'react'
import { Box, Stack } from '@mui/material'

type Props = {
  header: ReactNode
  notices?: ReactNode
  children: ReactNode
}

export default function WorkspaceLayout({ header, notices, children }: Props) {
  return (
    <Box id="workspace-scroll" sx={uiStyles.workspaceScroll}>
      <Box component="main" sx={uiStyles.workspaceContent}>
        <Stack {...uiProps.stackSection}>
          {notices}
          {header}
          <Box sx={uiStyles.shrinkable}>{children}</Box>
        </Stack>
      </Box>
    </Box>
  )
}
