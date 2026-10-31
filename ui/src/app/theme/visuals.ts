import type { Theme } from '@mui/material/styles'

export const illustrationColors = {
  vehicle: '#CE793C',
  vehicleOutline: '#38443C',
  wood: '#75482D',
  frame: '#28352D',
  rubber: '#202823',
  metal: '#758378',
  glass: '#A9B4AC',
  canvas: '#667066',
  canvasShadow: '#39483F',
  canvasFold: '#334037',
  canvasOutline: '#26342C',
}

export const occupancyChartProps = (theme: Theme) => ({
  container: { width: '100%' as const, height: '100%' as const },
  chart: { margin: { top: 24, right: 8, bottom: 0, left: -24 } },
  grid: {
    stroke: theme.palette.secondary.contrastText,
    strokeOpacity: 0.2,
    strokeDasharray: '3 3',
  },
  xAxis: {
    tick: {
      fill: theme.palette.secondary.contrastText,
      fontFamily: theme.typography.chartTick.fontFamily,
      fontSize: theme.typography.chartTick.fontSize,
    },
    tickMargin: 10,
    minTickGap: 12,
  },
  yAxis: {
    tick: {
      fill: theme.palette.secondary.contrastText,
      fontFamily: theme.typography.chartTick.fontFamily,
      fontSize: theme.typography.chartTick.fontSize,
    },
  },
  tooltip: {
    itemStyle: { color: theme.palette.secondary.contrastText },
    cursor: { fill: theme.palette.secondary.contrastText, fillOpacity: 0.08 },
    contentStyle: {
      backgroundColor: theme.palette.secondary.light,
      borderColor: theme.palette.secondary.dark,
      borderRadius: theme.shape.borderRadius,
      color: theme.palette.secondary.contrastText,
      fontFamily: theme.typography.body2.fontFamily,
      fontSize: theme.typography.body2.fontSize,
    },
  },
  bar: {
    fill: theme.palette.accent.main,
    radius: [6, 6, 0, 0] as [number, number, number, number],
    maxBarSize: 48,
  },
  labels: {
    fill: theme.palette.secondary.contrastText,
    fontFamily: theme.typography.chartLabel.fontFamily,
    fontSize: theme.typography.chartLabel.fontSize,
  },
})
