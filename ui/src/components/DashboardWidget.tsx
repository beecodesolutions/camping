import { uiProps, uiStyles } from '../app/theme'
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
  contentSpacing = uiProps.stackStandard.spacing,
}: DashboardWidgetProps) {
  return (
    <Paper
      component="section"
      aria-labelledby={titleId}
      variant="outlined"
      sx={uiStyles.dashboardWidgetPaper(height)}
    >
      <Stack spacing={contentSpacing}>
        <Stack {...uiProps.row} sx={uiStyles.dashboardWidgetStack}>
          <Stack {...uiProps.stackTight} sx={uiStyles.flexContent}>
            <Typography
              id={titleId}
              component="h2"
              variant={titleVariant}
              sx={uiStyles.dashboardWidgetTypography}
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
