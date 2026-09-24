import { readFileSync } from 'node:fs'
import type { DataSource } from 'typeorm'

export const PRIVATE_SCHEMA = 'camping_private'

export class CliInputError extends Error {}

export function inputError(message: string): never {
  throw new CliInputError(message)
}

export function reportCliFailure(label: string, error: unknown): void {
  console.error(
    error instanceof CliInputError
      ? error.message
      : `${label} failed; verify administrative database connectivity and current migration state`,
  )
}

export async function createAdminDataSource(): Promise<DataSource> {
  const configuredSchema = process.env.DB_SCHEMA
  if (configuredSchema && configuredSchema !== PRIVATE_SCHEMA) {
    inputError(`DB_SCHEMA must be ${PRIVATE_SCHEMA}`)
  }

  const runtimeUrl = process.env.DATABASE_URL
  if (process.env.DATABASE_ADMIN_URL)
    process.env.DATABASE_URL = process.env.DATABASE_ADMIN_URL
  try {
    const { createDataSource } = await import('../database/data-source')
    return createDataSource()
  } finally {
    if (runtimeUrl === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = runtimeUrl
  }
}

export function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

export function readPassword(
  useStdin: boolean,
  environmentName: string,
): string {
  const fromEnvironment = process.env[environmentName]
  if (fromEnvironment !== undefined && useStdin) {
    inputError(`Use either ${environmentName} or --password-stdin, not both`)
  }
  const password =
    fromEnvironment ??
    (useStdin ? readFileSync(0, 'utf8').replace(/\r?\n$/, '') : undefined)
  if (!password) {
    inputError(
      `Provide the password through ${environmentName} or --password-stdin; interactive input is intentionally not echoed or accepted`,
    )
  }
  if (password.length > 256) {
    inputError('Password must contain at most 256 characters')
  }
  return password
}

export async function destroy(dataSource: DataSource): Promise<void> {
  if (dataSource.isInitialized) await dataSource.destroy()
}
