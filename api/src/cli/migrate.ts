import {
  createAdminDataSource,
  destroy,
  PRIVATE_SCHEMA,
  quoteIdentifier,
  reportCliFailure,
} from './common'

async function migrate(): Promise<void> {
  const dataSource = await createAdminDataSource()
  try {
    await dataSource.initialize()
    // TypeORM creates its migrations table before the first migration runs.
    await dataSource.query(
      `CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(PRIVATE_SCHEMA)}`,
    )
    await dataSource.query(
      `REVOKE ALL ON SCHEMA ${quoteIdentifier(PRIVATE_SCHEMA)} FROM PUBLIC`,
    )
    const migrations = await dataSource.runMigrations({ transaction: 'all' })
    console.log(
      migrations.length
        ? `Applied ${migrations.length} migration(s)`
        : 'Database is up to date',
    )
  } finally {
    await destroy(dataSource)
  }
}

void migrate().catch((error: unknown) => {
  reportCliFailure('Migration', error)
  process.exitCode = 1
})
