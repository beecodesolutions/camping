import type { ValueTransformer } from 'typeorm'

export const bigintNumberTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value),
}
