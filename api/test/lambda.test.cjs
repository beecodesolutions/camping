const assert = require('node:assert/strict')
const { test } = require('node:test')
const { handler } = require('../dist/lambda')

test('Lambda entrypoint uses the Node 24 async handler signature', () => {
  assert.equal(handler.constructor.name, 'AsyncFunction')
  assert.equal(handler.length, 2)
})
