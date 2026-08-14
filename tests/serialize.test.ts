import { test } from 'node:test'
import assert from 'node:assert/strict'

import { deserialize } from '../src/deserialize.js'
import { serialize } from '../src/serialize.js'

function identity (value: string): string {
  return value
}

const opts = { caseType: identity, pluralTypes: identity }

test('serializes attributes', () => {
  const json = serialize('post', { title: 'Hi' }, opts)

  assert.deepEqual(JSON.parse(json), {
    data: { type: 'post', attributes: { title: 'Hi' } }
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
  assert.equal(included, undefined)
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
    () => serialize('post', { author: { type: 'users', name: 'Ann' } }, opts),
    /must have an ID/
  )
})

test('keeps an object with no identifier members as an attribute', () => {
  const json = serialize(
    'post',
    { title: 'Hi', metadata: { locale: 'en', draft: true } },
    opts
  )

  assert.deepEqual(JSON.parse(json), {
    data: {
      type: 'post',
      attributes: {
        title: 'Hi',
        metadata: { locale: 'en', draft: true }
      }
    }
  })
})

test('keeps a list of plain objects as an attribute', () => {
  const json = serialize(
    'post',
    { steps: [{ order: 1 }, { order: 2 }] },
    opts
  )
  const { data } = JSON.parse(json)

  assert.deepEqual(data.attributes.steps, [{ order: 1 }, { order: 2 }])
  assert.equal(data.relationships, undefined)
})

test('a single identifier member marks a list as a relationship', () => {
  assert.throws(
    () => serialize(
      'post',
      { comments: [{ type: 'comments' }, { body: 'Hi' }] },
      opts
    ),
    /must have an ID/
  )
})

test('sideposts a new resource through its lid', () => {
  const json = serialize(
    'post',
    {
      title: 'Hi',
      comments: [{ type: 'comments', lid: 'c-1', body: 'First' }]
    },
    opts
  )
  const { data, included } = JSON.parse(json)

  assert.deepEqual(data.relationships.comments.data, [
    { type: 'comments', lid: 'c-1' }
  ])
  assert.deepEqual(included, [
    { type: 'comments', lid: 'c-1', attributes: { body: 'First' } }
  ])
})

test('sideposts a to-one resource through its lid', () => {
  const json = serialize(
    'post',
    { author: { lid: 'u-1', name: 'Ann' } },
    opts
  )
  const { data, included } = JSON.parse(json)

  assert.deepEqual(data.relationships.author.data, {
    type: 'author',
    lid: 'u-1'
  })
  assert.deepEqual(included, [
    { type: 'author', lid: 'u-1', attributes: { name: 'Ann' } }
  ])
})

test('de-duplicates sideposted resources by lid', () => {
  const comment = { type: 'comments', lid: 'c-1', body: 'First' }
  const json = serialize(
    'post',
    { comments: [comment], pinned: comment },
    opts
  )
  const { included } = JSON.parse(json)

  assert.equal(included.length, 1)
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

  // Bare identifiers say nothing the linkage has not said already.
  assert.equal(included, undefined)
})

test('leaves bare identifiers out of included', () => {
  const json = serialize(
    'post',
    {
      author: { type: 'users', id: '9' },
      editor: { type: 'users', id: '8', name: 'Bob' },
      tags: [{ type: 'tags', id: '1' }]
    },
    opts
  )
  const { data, included } = JSON.parse(json)

  assert.deepEqual(data.relationships.author.data, {
    type: 'users',
    id: '9'
  })
  assert.deepEqual(included, [
    { type: 'users', id: '8', attributes: { name: 'Bob' } }
  ])
})

test('collects a resource sent bare first and in full later', () => {
  const json = serialize(
    'post',
    {
      author: { type: 'users', id: '9' },
      reviewer: { type: 'users', id: '9', name: 'Ann' }
    },
    opts
  )
  const { included } = JSON.parse(json)

  assert.deepEqual(included, [
    { type: 'users', id: '9', attributes: { name: 'Ann' } }
  ])
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

test('emits $ members next to attributes', () => {
  const json = serialize(
    'post',
    {
      title: 'Hi',
      $: {
        lid: 'tmp-1',
        meta: { draft: true },
        links: { self: '/posts/1' }
      }
    },
    opts
  )

  assert.deepEqual(JSON.parse(json), {
    data: {
      type: 'post',
      lid: 'tmp-1',
      meta: { draft: true },
      links: { self: '/posts/1' },
      attributes: { title: 'Hi' }
    }
  })
})

test('merges $ relationship meta with the derived linkage', () => {
  const json = serialize(
    'post',
    {
      author: { type: 'users', id: '9' },
      $: { relationships: { author: { meta: { role: 'primary' } } } }
    },
    opts
  )
  const { data } = JSON.parse(json)

  assert.deepEqual(data.relationships.author, {
    data: { type: 'users', id: '9' },
    meta: { role: 'primary' }
  })
})

test('$ relationship data replaces the derived linkage', () => {
  const json = serialize(
    'post',
    {
      tags: [{ type: 'tags', id: '1' }],
      $: {
        relationships: {
          tags: { data: [{ type: 'tags', id: '1', meta: { order: 1 } }] }
        }
      }
    },
    opts
  )
  const { data } = JSON.parse(json)

  assert.deepEqual(data.relationships.tags.data, [
    { type: 'tags', id: '1', meta: { order: 1 } }
  ])
})

test('merges $ attributes with the flat ones', () => {
  const json = serialize(
    'post',
    {
      title: 'Hi',
      $: { attributes: { title: 'Override', extra: true } }
    },
    opts
  )
  const { data } = JSON.parse(json)

  assert.deepEqual(data.attributes, {
    title: 'Override',
    extra: true
  })
})

test('serializes a relationship declared only in $', () => {
  const json = serialize(
    'post',
    { $: { relationships: { comments: { data: [] } } } },
    opts
  )
  const { data } = JSON.parse(json)

  assert.deepEqual(data.relationships.comments, { data: [] })
})

test('sends top-level document members', () => {
  const json = serialize('post', { title: 'Hi' }, opts, {
    meta: { source: 'cli' },
    jsonapi: { version: '1.1' }
  })

  assert.deepEqual(JSON.parse(json), {
    meta: { source: 'cli' },
    jsonapi: { version: '1.1' },
    data: { type: 'post', attributes: { title: 'Hi' } }
  })
})

test('round-trips a deserialized resource', () => {
  const resource = deserialize({
    data: {
      type: 'posts',
      id: '1',
      attributes: { title: 'Hi' },
      meta: { views: 10 }
    }
  }).data as Record<string, unknown>

  const json = serialize('posts', resource, opts)
  const { data } = JSON.parse(json)

  assert.deepEqual(data.meta, { views: 10 })
  assert.equal(data.attributes.title, 'Hi')
  assert.equal(data.id, '1')
})

test('round-trips a relationship whose identifier carries meta', () => {
  const resource = deserialize({
    data: {
      type: 'posts',
      id: '1',
      relationships: {
        author: { data: { type: 'users', id: '9', meta: { order: 1 } } },
        tags: { data: [{ type: 'tags', id: '1', meta: { order: 2 } }] }
      }
    }
  }).data as Record<string, unknown>

  const { data } = JSON.parse(serialize('posts', resource, opts))

  // The identifier `meta` survives, and the flat identifier is never
  // mistaken for a nested resource missing its `id`.
  assert.deepEqual(data.relationships.author.data, {
    type: 'users',
    id: '9',
    meta: { order: 1 }
  })
  assert.deepEqual(data.relationships.tags.data, [
    { type: 'tags', id: '1', meta: { order: 2 } }
  ])
})

test('keeps a list of plain values as an attribute', () => {
  const json = serialize(
    'post',
    { id: '1', tags: ['a', 'b'], scores: [1, 2] },
    opts
  )

  assert.deepEqual(JSON.parse(json), {
    data: {
      type: 'post',
      id: '1',
      attributes: { tags: ['a', 'b'], scores: [1, 2] }
    }
  })
})

test('omits id for a resource that only has a lid', () => {
  const json = serialize('post', { $: { lid: 'tmp-1' }, title: 'Hi' }, opts)

  assert.deepEqual(JSON.parse(json), {
    data: {
      type: 'post',
      lid: 'tmp-1',
      attributes: { title: 'Hi' }
    }
  })
})

test('$ cannot override the resource type and id', () => {
  const json = serialize(
    'post',
    { id: '1', $: { type: 'hacked', id: '999', meta: { ok: true } } },
    opts
  )

  assert.deepEqual(JSON.parse(json), {
    data: { type: 'post', id: '1', meta: { ok: true } }
  })
})

test('drops prototype-polluting $ members', () => {
  const json = serialize(
    'post',
    { id: '1', $: JSON.parse('{ "__proto__": { "x": 1 }, "meta": {} }') },
    opts
  )

  assert.equal(json.includes('__proto__'), false)
  assert.equal(({} as Record<string, unknown>).x, undefined)
})

test('document cannot smuggle its own data or included', () => {
  const json = serialize('post', { id: '1' }, opts, {
    data: { type: 'evil' },
    included: [{ type: 'evil', id: '1' }],
    meta: { source: 'cli' }
  })

  assert.deepEqual(JSON.parse(json), {
    meta: { source: 'cli' },
    data: { type: 'post', id: '1' }
  })
})
