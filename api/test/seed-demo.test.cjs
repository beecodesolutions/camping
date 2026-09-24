const test = require('node:test')
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const path = require('node:path')

test('demo CLI rejects production and remote database targets before connecting', () => {
  for (const overrides of [
    { NODE_ENV: 'production', DATABASE_URL: 'postgresql://localhost/camping' },
    {
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://example.invalid/camping',
    },
    {
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://localhost/camping',
      DATABASE_ADMIN_URL: 'postgresql://example.invalid/camping',
    },
  ]) {
    const result = spawnSync(
      process.execPath,
      [path.join(__dirname, '../dist/cli/seed-demo.js')],
      {
        env: { ...process.env, DATABASE_ADMIN_URL: '', ...overrides },
        encoding: 'utf8',
        timeout: 5000,
      },
    )
    assert.equal(result.status, 1)
    assert.match(
      result.stderr,
      /restricted to local PostgreSQL outside production/,
    )
  }
})

test('test seed exposes a production-capable isolated tenant command', () => {
  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, '../dist/cli/seed-test.js'), '--help'],
    { env: process.env, encoding: 'utf8', timeout: 5000 },
  )
  assert.equal(result.status, 0)
  assert.match(result.stdout, /valle-escondido/)
  assert.doesNotMatch(result.stdout, /\[DEMO\]/)
})

test('user CLI documents targeting the isolated tenant', () => {
  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, '../dist/cli/create-user.js'), '--help'],
    { env: process.env, encoding: 'utf8', timeout: 5000 },
  )
  assert.equal(result.status, 0)
  assert.match(result.stdout, /camping-key=la-izuelina\|valle-escondido/)
})
