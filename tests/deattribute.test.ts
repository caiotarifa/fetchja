import { test } from 'node:test'
import assert from 'node:assert/strict'

import { deattribute } from '../src/deattribute.js'

test('flattens attributes and relationships', () => {
  const result = deattribute({
    type: 'posts',
    id: '1',
    attributes: { title: 'Hi' },
    relationships: { author: { data: { type: 'users', id: '9' } } }
  })

  assert.deepEqual(result, {
    type: 'posts',
    id: '1',
    title: 'Hi',
    author: { type: 'users', id: '9' }
  })
})

test('maps over arrays', () => {
  const result = deattribute([
    { type: 'posts', id: '1', attributes: { title: 'A' } }
  ]) as Record<string, unknown>[]

  assert.equal(result[0]?.title, 'A')
})

test('drops prototype-polluting attribute keys', () => {
  const result = deattribute({
    type: 'posts',
    id: '1',
    attributes: JSON.parse('{ "__proto__": { "x": 1 }, "ok": true }')
  }) as Record<string, unknown>

  assert.equal(result.ok, true)
  assert.equal(({} as Record<string, unknown>).x, undefined)
})

test('keeps an explicit null to-one relationship', () => {
  const result = deattribute({
    type: 'posts',
    id: '1',
    relationships: { author: { data: null } }
  }) as Record<string, unknown>

  assert.ok('author' in result)
  assert.equal(result.author, null)
})

test('drops prototype-polluting relationship keys', () => {
  const result = deattribute({
    type: 'posts',
    id: '1',
    relationships: JSON.parse(
      '{ "__proto__": { "data": { "x": 1 } },' +
      ' "author": { "data": { "type": "users", "id": "9" } } }'
    )
  }) as Record<string, unknown>

  assert.deepEqual(result.author, { type: 'users', id: '9' })
  assert.equal(({} as Record<string, unknown>).x, undefined)
})
