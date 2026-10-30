// Validate configuration without connecting or including the URL in errors.
const { existsSync } = require('node:fs')

try {
  const url = new URL(process.env.DATABASE_ADMIN_URL)
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !/^aws-[0-9]+-us-east-1\.pooler\.supabase\.com$/.test(url.hostname) ||
    url.port !== '5432' ||
    url.username !== 'postgres.xpnleaxbatypnbbwzeku' ||
    !url.password ||
    url.pathname !== '/postgres' ||
    url.search ||
    url.hash ||
    process.env.DATABASE_SSL !== 'true' ||
    !existsSync(process.env.NODE_EXTRA_CA_CERTS ?? '') ||
    process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0'
  ) {
    throw new Error()
  }
} catch {
  console.error(
    'Invalid production admin configuration: require the production Supabase session pooler on port 5432, verified TLS and the bundled CA; no URL query parameters.',
  )
  process.exitCode = 1
}
