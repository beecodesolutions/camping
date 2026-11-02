import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import {
  ekkoPriceboardConfigSchema,
  configureEkkoPriceboard,
} from './ekko-priceboard-config'
import {
  createAdminDataSource,
  destroy,
  inputError,
  reportCliFailure,
} from './common'

const HELP = `Usage:
  pnpm config:ekko --camping-key=<stable-key> [--config=<priceboard.json>]
  pnpm config:ekko --camping-key=<stable-key> [--config=<priceboard.json>] --apply

Uses api/config/ekko-priceboard.json unless --config is supplied.
Read-only preview by default. Null owner decisions defer affected products.
Apply is transactional and safe to rerun.
Remote/production apply additionally requires --production,
--expected-camping-id=<uuid> and --deployment-sha=<verified-40-character-sha>.
Verify that successful deploy and its public API before passing those flags.
No migrations, deployments, users, bookings or payments are created by this CLI.`

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args[0] === '--') args.shift()
  const { values } = parseArgs({
    args,
    strict: true,
    options: {
      help: { type: 'boolean', short: 'h' },
      'camping-key': { type: 'string' },
      config: { type: 'string' },
      apply: { type: 'boolean' },
      production: { type: 'boolean' },
      'expected-camping-id': { type: 'string' },
      'deployment-sha': { type: 'string' },
    },
  })
  if (values.help) {
    console.log(HELP)
    return
  }
  if (!values['camping-key'])
    inputError('Provide --camping-key; use --help for usage')
  const connection = process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL
  const host = connection
    ? new URL(connection).hostname
    : (process.env.DB_HOST ?? 'localhost')
  const remote =
    !['localhost', '127.0.0.1', '::1', '[::1]'].includes(host) ||
    process.env.NODE_ENV === 'production'
  if (
    values.apply &&
    remote &&
    (!values.production ||
      !values['expected-camping-id'] ||
      !values['deployment-sha']?.match(/^[a-f0-9]{40}$/))
  )
    inputError(
      'Remote apply requires --production, --expected-camping-id and --deployment-sha after verifying the deploy',
    )
  if (remote && process.env.DATABASE_SSL !== 'true')
    inputError(
      'Remote configuration requires DATABASE_SSL=true with a trusted certificate',
    )
  const configPath =
    values.config ??
    path.resolve(__dirname, '../../config/ekko-priceboard.json')
  let rawConfig: unknown
  try {
    rawConfig = JSON.parse(await readFile(configPath, 'utf8'))
  } catch {
    inputError('Cannot read the priceboard configuration JSON')
  }
  const config = ekkoPriceboardConfigSchema.safeParse(rawConfig)
  if (!config.success)
    inputError(
      `Incomplete priceboard configuration: ${config.error.issues.map((i) => i.path.join('.')).join(', ')}`,
    )
  const ds = await createAdminDataSource()
  try {
    await ds.initialize()
    const report = await configureEkkoPriceboard(ds, {
      campingKey: values['camping-key'],
      config: config.data,
      apply: values.apply ?? false,
      expectedCampingId: values['expected-camping-id'],
      deploymentSha: values['deployment-sha'],
    })
    if (values.apply) {
      const verification = await configureEkkoPriceboard(ds, {
        campingKey: values['camping-key'],
        config: config.data,
        apply: false,
        expectedCampingId: report.campingId,
      })
      if (verification.changes.length)
        inputError(
          'Configuration committed but readback differs; inspect current state before retrying',
        )
      console.log(
        JSON.stringify({ ...report, readBackVerified: true }, null, 2),
      )
    } else console.log(JSON.stringify(report, null, 2))
  } finally {
    await destroy(ds)
  }
}
if (require.main === module)
  void main().catch((error: unknown) => {
    reportCliFailure('Ekko priceboard configuration', error)
    process.exitCode = 1
  })
