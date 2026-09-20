import { Box, Paper, Stack, SvgIcon, Typography, useTheme } from '@mui/material'
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
  const theme = useTheme()
  const today = new Date()
  const data = exampleGroups.map((groups, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    return {
      day: date.toLocaleDateString('es-CL', {
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
      sx={{
        p: 2,
        borderRadius: 2,
        gridColumn: '1 / -1',
        minWidth: 0,
        bgcolor: 'secondary.light',
        color: 'secondary.contrastText',
        borderColor: 'divider',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <SvgIcon color="inherit" aria-hidden="true">
          <path d="M4 13h4v7H4zm6-9h4v16h-4zm6 5h4v11h-4z" />
        </SvgIcon>
        <Typography
          id="occupancy-history-title"
          component="h2"
          variant="subtitle1"
          sx={{ fontWeight: 700 }}
        >
          Ocupación · últimos 7 días
        </Typography>
      </Stack>
      <Typography variant="body2" color="inherit" sx={{ mt: 0.5, mb: 3 }}>
        Grupos alojados por día
      </Typography>
      <Box sx={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            accessibilityLayer
            margin={{ top: 24, right: 8, bottom: 0, left: -24 }}
          >
            <CartesianGrid
              vertical={false}
              stroke={theme.palette.secondary.contrastText}
              strokeOpacity={0.2}
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: theme.palette.secondary.contrastText,
                fontSize: 12,
              }}
              tickMargin={10}
              interval={0}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{
                fill: theme.palette.secondary.contrastText,
                fontSize: 12,
              }}
              domain={[0, 12]}
              ticks={[0, 3, 6, 9, 12]}
            />
            <Tooltip
              itemStyle={{ color: theme.palette.secondary.contrastText }}
              cursor={{
                fill: theme.palette.secondary.contrastText,
                fillOpacity: 0.08,
              }}
              contentStyle={{
                backgroundColor: theme.palette.secondary.light,
                borderColor: theme.palette.secondary.dark,
                borderRadius: theme.shape.borderRadius,
                color: theme.palette.secondary.contrastText,
              }}
            />
            <Bar
              dataKey="groups"
              name="Grupos alojados"
              fill={theme.palette.accent.main}
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="groups"
                position="top"
                fill={theme.palette.secondary.contrastText}
                fontSize={13}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  )
}
