import { test } from 'node:test'
import assert from 'node:assert/strict'

import { serialize } from '../src/serialize.js'

function identity (value: string): string {
  return value
}

const opts = { caseType: identity, pluralTypes: identity }

test('serializes attributes', () => {
  const json = serialize('post', { title: 'Hi' }, opts)

  assert.deepEqual(JSON.parse(json), {
    data: { type: 'post', attributes: { title: 'Hi' } },
    included: []
  })
})

test('treats null and Date as attributes, not relationships', () => {
  const date = new Date('2020-01-01T00:00:00.000Z')
  const json = serialize('post', { author: null, at: date }, opts)
  const { data } = JSON.parse(json)

  assert.equal(data.attributes.author, null)
  assert.equal(data.attributes.at, date.toISOString())
  assert.equal(data.relationships, undefined)
})

test('builds to-one relationships and included', () => {
  const json = serialize(
    'post',
    { author: { type: 'users', id: '9', name: 'Ann' } },
    opts
  )
  const { data, included } = JSON.parse(json)

  assert.deepEqual(data.relationships.author.data, {
    type: 'users',
    id: '9'
  })
  assert.equal(included.length, 1)
  assert.equal(included[0].attributes.name, 'Ann')
})

test('clears a to-one relationship with an explicit null id', () => {
  const json = serialize(
    'brand',
    { id: '1', logoDocument: { type: 'documents', id: null } },
    opts
  )
  const { data, included } = JSON.parse(json)

  assert.deepEqual(data.relationships.logoDocument, { data: null })
  assert.equal(data.attributes, undefined)
  assert.deepEqual(included, [])
})

test('clears a to-one relationship without a type', () => {
  const json = serialize('brand', { id: '1', author: { id: null } }, opts)
  const { data } = JSON.parse(json)

  assert.deepEqual(data.relationships.author, { data: null })
})

test('clears a to-one relationship on a nested resource', () => {
  const json = serialize(
    'post',
    {
      author: {
        type: 'users',
        id: '9',
        company: { type: 'companies', id: null }
      }
    },
    opts
  )
  const { included } = JSON.parse(json)

  assert.deepEqual(included[0].relationships.company, { data: null })
  assert.equal(included.length, 1)
})

test('throws FetchjaError when included resource lacks an id', () => {
  assert.throws(
    () => serialize('post', { author: { name: 'Ann' } }, opts),
    /must have an ID/
  )
})

test('builds to-many relationships and coerces ids to strings', () => {
  const json = serialize(
    'post',
    { tags: [{ type: 'tags', id: 1 }, { type: 'tags', id: 2 }] },
    opts
  )
  const { data, included } = JSON.parse(json)

  assert.deepEqual(data.relationships.tags.data, [
    { type: 'tags', id: '1' },
    { type: 'tags', id: '2' }
  ])
  assert.equal(included.length, 2)
})

test('included resource type matches the relationship pointer', () => {
  const json = serialize(
    'post',
    { author: { type: 'users', id: '9', name: 'Ann' } },
    opts
  )
  const { data, included } = JSON.parse(json)

  assert.equal(included[0].type, 'users')
  assert.equal(data.relationships.author.data.type, included[0].type)
})

test('collects nested relationships recursively', () => {
  const json = serialize(
    'post',
    {
      author: {
        type: 'users',
        id: '9',
        name: 'Ann',
        company: { type: 'companies', id: '5', name: 'Acme' }
      }
    },
    opts
  )
  const { included } = JSON.parse(json)

  const users = included.find((item: any) => item.type === 'users')
  const companies = included.find((item: any) => item.type === 'companies')

  assert.equal(included.length, 2)
  assert.equal(users.relationships.company.data.id, '5')
  assert.equal(companies.attributes.name, 'Acme')
})

test('de-duplicates a resource shared across relationships', () => {
  const author = { type: 'users', id: '9', name: 'Ann' }

  const json = serialize('post', { author, reviewers: [author] }, opts)
  const { included } = JSON.parse(json)

  assert.equal(included.length, 1)
  assert.equal(included[0].id, '9')
})
