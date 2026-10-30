const assert = require('node:assert/strict')
const { setTimeout } = require('node:timers/promises')

async function check(base) {
  assert.match(
    base,
    /^https:\/\/[a-z0-9]+\.execute-api\.us-east-1\.amazonaws\.com\/api$/,
  )
  const endpoint = `${base}/auth/session`
  const origin = 'https://www.maytu.app'
  const session = await fetch(endpoint, {
    headers: { Origin: origin },
    signal: AbortSignal.timeout(20000),
  })
  assert.equal(session.status, 401)
  assert.equal(session.headers.get('access-control-allow-origin'), origin)
  assert.equal(session.headers.get('access-control-allow-credentials'), 'true')
  assert.equal((await session.json()).code, 'UNAUTHORIZED')
  const preflight = await fetch(endpoint, {
    method: 'OPTIONS',
    headers: { Origin: origin, 'Access-Control-Request-Method': 'GET' },
    signal: AbortSignal.timeout(20000),
  })
  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers.get('access-control-allow-origin'), origin)
  const foreign = await fetch(`${base}/auth/logout`, {
    method: 'POST',
    headers: { Origin: 'https://foreign.example' },
    signal: AbortSignal.timeout(20000),
  })
  assert.equal(foreign.status, 403)
  assert.equal((await foreign.json()).code, 'ORIGIN_NOT_ALLOWED')
  assert.notEqual(
    foreign.headers.get('access-control-allow-origin'),
    'https://foreign.example',
  )
}

async function main() {
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      await check(process.argv[2])
      console.log(
        'Published API: unauthenticated session, canonical CORS, preflight and foreign-origin rejection passed.',
      )
      return
    } catch {
      if (attempt === 6)
        throw new Error(
          'Published API HTTP checks failed; inspect API and CloudFormation logs.',
        )
      await setTimeout(5000)
    }
  }
}

void main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
