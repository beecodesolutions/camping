import { createAdminDataSource, destroy, reportCliFailure } from './common'

async function revert(): Promise<void> {
  const dataSource = await createAdminDataSource()
  try {
    await dataSource.initialize()
    await dataSource.undoLastMigration({ transaction: 'all' })
    console.log('Reverted the last migration')
  } finally {
    await destroy(dataSource)
  }
}

void revert().catch((error: unknown) => {
  reportCliFailure('Migration revert', error)
  process.exitCode = 1
})
