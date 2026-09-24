import { parseArgs } from 'node:util'
import argon2 from 'argon2'
import { AuthService } from '../auth/auth.service'
import { CampingEntity } from '../database/entities/camping.entity'
import { SessionEntity } from '../database/entities/session.entity'
import { UserEntity } from '../database/entities/user.entity'
import {
  createAdminDataSource,
  destroy,
  inputError,
  readPassword,
  reportCliFailure,
} from './common'

const HELP = `Usage:
  pnpm user -- create --username=USER --name="Display name" [--camping-key=la-izuelina] [--password-stdin]
  pnpm user -- change-password --username=USER [--password-stdin]
  pnpm user -- disable --username=USER

Passwords are accepted only through USER_PASSWORD or --password-stdin. This command never accepts a password argument or uses an echoing prompt.`

function required(
  value: string | undefined,
  label: string,
  max: number,
): string {
  const normalized = value?.trim()
  if (!normalized) inputError(`${label} is required`)
  if (normalized.length > max) {
    inputError(`${label} must contain at most ${max} characters`)
  }
  return normalized
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args[0] === '--') args.shift()
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    strict: true,
    options: {
      help: { type: 'boolean', short: 'h' },
      username: { type: 'string' },
      name: { type: 'string' },
      'camping-key': { type: 'string' },
      'password-stdin': { type: 'boolean' },
    },
  })
  const action = positionals[0]
  if (values.help || !action) {
    console.log(HELP)
    return
  }
  if (
    positionals.length !== 1 ||
    !['create', 'change-password', 'disable'].includes(action)
  ) {
    inputError(`Unknown action.\n\n${HELP}`)
  }

  const username = required(values.username, 'username', 100)
  const dataSource = await createAdminDataSource()
  try {
    await dataSource.initialize()
    if (action === 'create') {
      const name = required(values.name, 'name', 160)
      const campingKey = required(
        values['camping-key'] ?? process.env.CAMPING_KEY ?? 'la-izuelina',
        'camping-key',
        100,
      )
      const password = readPassword(
        values['password-stdin'] ?? false,
        'USER_PASSWORD',
      )
      const camping = await dataSource
        .getRepository(CampingEntity)
        .findOne({ where: { stableKey: campingKey } })
      if (!camping) {
        inputError(`Camping ${campingKey} not found; run seed first`)
      }
      const user = await new AuthService(dataSource).createUser({
        username,
        name,
        password,
        campingId: camping.id,
      })
      console.log(`Created user ${user.username} for ${camping.name}`)
      return
    }

    const password =
      action === 'change-password'
        ? readPassword(values['password-stdin'] ?? false, 'USER_PASSWORD')
        : null
    const passwordHash = password
      ? await argon2.hash(password, { type: argon2.argon2id })
      : null
    await dataSource.transaction(async (manager) => {
      const user = await manager.findOne(UserEntity, {
        where: { username },
        lock: { mode: 'pessimistic_write' },
      })
      if (!user) inputError(`User ${username} not found`)
      if (passwordHash) {
        user.passwordHash = passwordHash
        user.passwordChangedAt = new Date()
        user.failedLoginCount = 0
        user.loginBlockedUntil = null
      } else {
        user.enabled = false
      }
      await manager.save(user)
      await manager.delete(SessionEntity, { userId: user.id })
    })
    console.log(
      action === 'change-password'
        ? `Changed password and revoked sessions for ${username}`
        : `Disabled user and revoked sessions for ${username}`,
    )
  } finally {
    await destroy(dataSource)
  }
}

void main().catch((error: unknown) => {
  reportCliFailure('User administration', error)
  process.exitCode = 1
})
