import { uiProps, uiStyles } from './app/theme'
import { occupancyChartProps } from './app/theme'
import { useTranslation } from 'react-i18next'
import { Box, Paper, Stack, Typography, useTheme } from '@mui/material'
import { BarChart3 } from 'lucide-react'
import LucideIcon from './components/LucideIcon'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const exampleGroups = [4, 6, 5, 9, 12, 10, 8]

export default function OccupancyChart() {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const chartStyles = occupancyChartProps(theme)
  const today = new Date()
  const data = exampleGroups.map((groups, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    return {
      day: date.toLocaleDateString(i18n.language, {
        day: 'numeric',
        month: 'numeric',
      }),
      groups,
    }
  })

  return (
    <Paper
      component="section"
      aria-labelledby="occupancy-history-title"
      variant="outlined"
      sx={uiStyles.occupancyChartPaper}
    >
      <Stack {...uiProps.rowSmall} sx={uiStyles.alignCenter}>
        <LucideIcon icon={BarChart3} color="inherit" aria-hidden="true" />
        <Typography
          id="occupancy-history-title"
          component="h2"
          variant="subtitle1"
          sx={uiStyles.boldText}
        >
          {t('home.historyTitle')}
        </Typography>
      </Stack>
      <Typography
        variant="body2"
        color="inherit"
        sx={uiStyles.occupancyChartTypography2}
      >
        {t('home.historyDescription')} · {t('home.historySample')}
      </Typography>
      <Box sx={uiStyles.occupancyChartBox}>
        <ResponsiveContainer {...chartStyles.container}>
          <BarChart data={data} accessibilityLayer {...chartStyles.chart}>
            <CartesianGrid vertical={false} {...chartStyles.grid} />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              {...chartStyles.xAxis}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              {...chartStyles.yAxis}
              domain={[0, 12]}
              ticks={[0, 3, 6, 9, 12]}
            />
            <Tooltip {...chartStyles.tooltip} />
            <Bar
              dataKey="groups"
              name={t('home.historySeries')}
              {...chartStyles.bar}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="groups"
                position="top"
                {...chartStyles.labels}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  )
}
