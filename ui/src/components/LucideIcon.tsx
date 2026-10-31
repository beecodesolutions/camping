import { lucideIconStyles } from '../app/theme'
import { SvgIcon, type SvgIconProps } from '@mui/material'
import type { LucideIcon as LucideIconComponent } from 'lucide-react'

export type LucideIconProps = Omit<SvgIconProps, 'children' | 'component'> & {
  icon: LucideIconComponent
}

/**
 * Keeps Lucide icons aligned with the MUI theme and sizing API.
 *
 * MUI's SvgIcon supplies palette-aware color classes and font-size rules. The
 * explicit fill override preserves Lucide's outlined stroke rendering when
 * SvgIcon is used with a custom component.
 */
export default function LucideIcon({
  icon: Icon,
  sx,
  ...props
}: LucideIconProps) {
  return (
    <SvgIcon
      {...props}
      component={Icon}
      inheritViewBox
      sx={lucideIconStyles(sx)}
    />
  )
}
