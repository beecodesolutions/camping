import type { CSSProperties, ReactNode } from 'react'
import { Paper, Stack, Typography, type TypographyProps } from '@mui/material'

type DashboardWidgetProps = {
  title: ReactNode
  titleId: string
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  height?: CSSProperties['height']
  titleVariant?: TypographyProps['variant']
  contentSpacing?: number | string
}

export default function DashboardWidget({
  title,
  titleId,
  subtitle,
  action,
  children,
  height,
  titleVariant = 'subtitle1',
  contentSpacing = 2,
}: DashboardWidgetProps) {
  return (
    <Paper
      component="section"
      aria-labelledby={titleId}
      variant="outlined"
      sx={{
        p: 2,
        ...(height === undefined ? {} : { height }),
      }}
    >
      <Stack spacing={contentSpacing}>
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              id={titleId}
              component="h2"
              variant={titleVariant}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                minWidth: 0,
                overflowWrap: 'anywhere',
                fontWeight: 700,
              }}
            >
              {title}
            </Typography>
            {subtitle !== undefined && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Stack>
          {action}
        </Stack>
        {children}
      </Stack>
    </Paper>
  )
}
