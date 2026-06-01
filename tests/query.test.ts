import { test } from 'node:test'
import assert from 'node:assert/strict'

import { queryFormatter } from '../src/query.js'

test('formats flat params', () => {
  const q = queryFormatter({ page: 1, sort: 'name' })

  assert.equal(q.get('page'), '1')
  assert.equal(q.get('sort'), 'name')
})

test('formats nested objects with bracket notation', () => {
  const q = queryFormatter({ filter: { status: 'active' } })

  assert.equal(q.get('filter[status]'), 'active')
})

test('formats arrays with empty brackets', () => {
  const q = queryFormatter({ include: ['author', 'comments'] })

  assert.deepEqual(q.getAll('include[]'), ['author', 'comments'])
})

test('ignores prototype-polluting keys', () => {
  const q = queryFormatter(
    JSON.parse('{ "__proto__": { "x": 1 }, "ok": 2 }')
  )

  assert.equal(q.get('ok'), '2')
  assert.equal(({} as Record<string, unknown>).x, undefined)
})
