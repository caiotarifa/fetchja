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

test('keeps resource meta, links, and lid under $', () => {
  const result = deattribute({
    type: 'posts',
    id: '1',
    lid: 'tmp-1',
    attributes: { title: 'Hi' },
    links: { self: '/posts/1' },
    meta: { views: 10 }
  }) as Record<string, any>

  assert.equal(result.title, 'Hi')
  assert.deepEqual(result.$, {
    lid: 'tmp-1',
    links: { self: '/posts/1' },
    meta: { views: 10 }
  })
})

test('keeps unknown resource members under $', () => {
  const result = deattribute({
    'type': 'posts',
    'id': '1',
    'version-history': { versions: [] }
  }) as Record<string, any>

  assert.deepEqual(result.$['version-history'], { versions: [] })
})

test('omits $ when there is nothing to carry', () => {
  const result = deattribute({
    type: 'posts',
    id: '1',
    attributes: { title: 'Hi' },
    relationships: { author: { data: { type: 'users', id: '9' } } }
  }) as Record<string, any>

  assert.equal('$' in result, false)
})

test('an attribute named meta does not collide with resource meta', () => {
  const result = deattribute({
    type: 'pages',
    id: '1',
    attributes: { meta: { description: 'SEO' } },
    meta: { views: 10 }
  }) as Record<string, any>

  assert.deepEqual(result.meta, { description: 'SEO' })
  assert.deepEqual(result.$.meta, { views: 10 })
})

test('keeps relationship meta and links under $', () => {
  const result = deattribute({
    type: 'posts',
    id: '1',
    relationships: {
      author: {
        data: { type: 'users', id: '9' },
        links: { self: '/posts/1/relationships/author' },
        meta: { role: 'primary' }
      }
    }
  }) as Record<string, any>

  assert.deepEqual(result.author, { type: 'users', id: '9' })
  assert.deepEqual(result.$.relationships.author, {
    links: { self: '/posts/1/relationships/author' },
    meta: { role: 'primary' }
  })
})

test('keeps a relationship that has links but no data', () => {
  const result = deattribute({
    type: 'posts',
    id: '1',
    relationships: {
      comments: { links: { related: '/posts/1/comments' } }
    }
  }) as Record<string, any>

  assert.equal('comments' in result, false)
  assert.deepEqual(result.$.relationships.comments, {
    links: { related: '/posts/1/comments' }
  })
})

test('keeps the raw linkage when an identifier carries meta', () => {
  const result = deattribute({
    type: 'posts',
    id: '1',
    relationships: {
      tags: {
        data: [
          { type: 'tags', id: '1', meta: { order: 1 } },
          { type: 'tags', id: '2' }
        ]
      }
    }
  }) as Record<string, any>

  assert.equal(result.tags.length, 2)
  assert.deepEqual(result.$.relationships.tags.data[0].meta, { order: 1 })
})
