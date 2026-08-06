import { test } from 'node:test'
import assert from 'node:assert/strict'

import { deserialize } from '../src/deserialize.js'

test('flattens data and meta', () => {
  const result = deserialize({
    data: { type: 'posts', id: '1', attributes: { title: 'Hi' } },
    meta: { total: 1 }
  })

  assert.equal((result.data as Record<string, unknown>).title, 'Hi')
  assert.deepEqual(result.meta, { total: 1 })
})

test('resolves included relationships by type and id', () => {
  const result = deserialize({
    data: {
      type: 'posts',
      id: '1',
      relationships: { author: { data: { type: 'users', id: '9' } } }
    },
    included: [
      { type: 'users', id: '9', attributes: { name: 'Ann' } }
    ]
  })
  const data = result.data as Record<string, any>

  assert.equal(data.author.name, 'Ann')
})

test('does not collide ids across types', () => {
  const result = deserialize({
    data: {
      type: 'posts',
      id: '1',
      relationships: { author: { data: { type: 'users', id: '1' } } }
    },
    included: [
      { type: 'users', id: '1', attributes: { name: 'Ann' } }
    ]
  })
  const data = result.data as Record<string, any>

  assert.equal(data.author.name, 'Ann')
})

test('resolves to-many relationships from included', () => {
  const result = deserialize({
    data: {
      type: 'posts',
      id: '1',
      relationships: {
        tags: {
          data: [
            { type: 'tags', id: '1' },
            { type: 'tags', id: '2' }
          ]
        }
      }
    },
    included: [
      { type: 'tags', id: '1', attributes: { label: 'a' } },
      { type: 'tags', id: '2', attributes: { label: 'b' } }
    ]
  })
  const data = result.data as Record<string, any>

  assert.equal(data.tags.length, 2)
  assert.equal(data.tags[0].label, 'a')
  assert.equal(data.tags[1].label, 'b')
})

test('resolves included on a collection (data is an array)', () => {
  const result = deserialize({
    data: [
      {
        type: 'posts',
        id: '1',
        relationships: { author: { data: { type: 'users', id: '9' } } }
      },
      {
        type: 'posts',
        id: '2',
        relationships: { author: { data: { type: 'users', id: '9' } } }
      }
    ],
    included: [
      { type: 'users', id: '9', attributes: { name: 'Ann' } }
    ]
  })
  const data = result.data as Record<string, any>[]

  assert.equal(data[0]?.author.name, 'Ann')
  assert.equal(data[1]?.author.name, 'Ann')
})

test('resolves relationships between included resources', () => {
  const result = deserialize({
    data: {
      type: 'posts',
      id: '1',
      relationships: { author: { data: { type: 'users', id: '9' } } }
    },
    included: [
      {
        type: 'users',
        id: '9',
        attributes: { name: 'Ann' },
        relationships: {
          company: { data: { type: 'companies', id: '5' } }
        }
      },
      { type: 'companies', id: '5', attributes: { name: 'Acme' } }
    ]
  })
  const data = result.data as Record<string, any>

  assert.equal(data.author.name, 'Ann')
  assert.equal(data.author.company.name, 'Acme')
})

test('leaves an unknown reference as a bare identifier', () => {
  const result = deserialize({
    data: {
      type: 'posts',
      id: '1',
      relationships: { author: { data: { type: 'users', id: '404' } } }
    },
    included: [
      { type: 'users', id: '9', attributes: { name: 'Ann' } }
    ]
  })
  const data = result.data as Record<string, any>

  assert.deepEqual(data.author, { type: 'users', id: '404' })
})

test('passes top-level links and jsonapi through', () => {
  const result = deserialize({
    data: [],
    links: { self: '/posts?page=1', next: '/posts?page=2' },
    jsonapi: { version: '1.1', ext: [], meta: { host: 'a' } }
  })

  assert.deepEqual(result.links, {
    self: '/posts?page=1',
    next: '/posts?page=2'
  })
  assert.equal((result.jsonapi as Record<string, unknown>).version, '1.1')
})

test('keeps relationship links and meta while resolving included', () => {
  const result = deserialize({
    data: {
      type: 'posts',
      id: '1',
      relationships: {
        author: {
          data: { type: 'users', id: '9' },
          links: { related: '/posts/1/author' },
          meta: { role: 'primary' }
        }
      }
    },
    included: [
      { type: 'users', id: '9', attributes: { name: 'Ann' } }
    ]
  })
  const data = result.data as Record<string, any>

  assert.equal(data.author.name, 'Ann')
  assert.deepEqual(data.$.relationships.author, {
    links: { related: '/posts/1/author' },
    meta: { role: 'primary' }
  })
})

test('an included resource carries its own $', () => {
  const result = deserialize({
    data: {
      type: 'posts',
      id: '1',
      relationships: { author: { data: { type: 'users', id: '9' } } }
    },
    included: [
      {
        type: 'users',
        id: '9',
        attributes: { name: 'Ann' },
        meta: { verified: true }
      }
    ]
  })
  const data = result.data as Record<string, any>

  assert.deepEqual(data.author.$.meta, { verified: true })
})

test('identifier meta does not leak into the shared resource', () => {
  const result = deserialize({
    data: [
      {
        type: 'posts',
        id: '1',
        relationships: {
          author: { data: { type: 'users', id: '9', meta: { order: 1 } } }
        }
      },
      {
        type: 'posts',
        id: '2',
        relationships: {
          author: { data: { type: 'users', id: '9', meta: { order: 2 } } }
        }
      }
    ],
    included: [
      { type: 'users', id: '9', attributes: { name: 'Ann' } }
    ]
  })
  const [first, second] = result.data as Record<string, any>[]

  assert.equal(first?.author, second?.author)
  assert.equal(Object.hasOwn(first?.author, 'meta'), false)
  assert.deepEqual(first?.$.relationships.author.data.meta, { order: 1 })
  assert.deepEqual(second?.$.relationships.author.data.meta, { order: 2 })
})

test('leaves the $ envelope untouched while linking', () => {
  const result = deserialize({
    data: {
      type: 'posts',
      id: '1',
      meta: { type: 'users', id: '9' },
      relationships: { author: { data: { type: 'users', id: '9' } } }
    },
    included: [
      { type: 'users', id: '9', attributes: { name: 'Ann' } }
    ]
  })
  const data = result.data as Record<string, any>

  assert.deepEqual(data.$.meta, { type: 'users', id: '9' })
})
