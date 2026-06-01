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
