import type { z } from 'zod'
import {
  addExtraSchema,
  extraTemplateInputSchema,
  extraTemplatePatchSchema,
} from '@camping/contracts'
export type LoginInput = { username: string; password: string }
export type ExtraTemplateInput = z.input<typeof extraTemplateInputSchema>
export type ExtraTemplatePatch = z.input<typeof extraTemplatePatchSchema>
export type AddExtraInput = z.input<typeof addExtraSchema>
export type RateInput = { adults: number; children: number; infants: number }
