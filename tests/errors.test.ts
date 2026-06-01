import { test } from 'node:test'
import assert from 'node:assert/strict'

import { FetchjaError } from '../src/errors.js'

test('FetchjaError carries status and errors', () => {
  const error = new FetchjaError('Not Found', {
    status: 404,
    statusText: 'Not Found',
    errors: [{ detail: 'Missing' }]
  })

  assert.ok(error instanceof Error)
  assert.equal(error.name, 'FetchjaError')
  assert.equal(error.message, 'Not Found')
  assert.equal(error.status, 404)
  assert.deepEqual(error.errors, [{ detail: 'Missing' }])
})

test('FetchjaError works with no init', () => {
  const error = new FetchjaError('Boom')

  assert.equal(error.status, undefined)
})
