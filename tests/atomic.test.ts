import { test } from 'node:test'
import assert from 'node:assert/strict'

import { AtomicOperations, ATOMIC_EXT } from '../src/atomic.js'
import Fetchja from '../src/client.js'
import { FetchjaError } from '../src/errors.js'

import type { Operation, OperationBuilder } from '../src/atomic.js'

const ATOMIC_MEDIA_TYPE =
  `application/vnd.api+json;ext="${ATOMIC_EXT}"`

interface Sent {
  url: string
  method?: string
  accept: string | null
  contentType: string | null
  document: Record<string, unknown>
}

/**
 * Build a client that captures the request instead of sending it, and
 * answers with the given document.
 */
function client (
  body: unknown = { 'atomic:results': [] },
  status = 200,
  options: { endpoint?: string } = {}
): { api: Fetchja, sent: () => Sent } {
  let sent: Sent | undefined

  const api = new Fetchja({
    baseURL: 'https://api.test',
    extensions: [
      options.endpoint === undefined
        ? AtomicOperations
        : AtomicOperations({ endpoint: options.endpoint })
    ],
    fetch: async (url, init) => {
      const headers = new Headers(init?.headers)

      sent = {
        url: String(url),
        method: init?.method,
        accept: headers.get('accept'),
        contentType: headers.get('content-type'),
        document: JSON.parse(String(init?.body))
      }

      return status === 204
        ? new Response(null, { status })
        : new Response(JSON.stringify(body), {
            status,
            headers: { 'content-type': ATOMIC_MEDIA_TYPE }
          })
    }
  })

  return { api, sent: () => sent as Sent }
}

/**
 * Send one batch and return the operations that went on the wire.
 */
async function operations (
  build: (op: OperationBuilder) => Operation[]
): Promise<unknown[]> {
  const { api, sent } = client()

  await api.atomic(build)

  return sent().document['atomic:operations'] as unknown[]
}

test('posts to the operations endpoint with its media type', async () => {
  const { api, sent } = client()

  await api.atomic(op => [op.remove('article', '13')])

  assert.equal(sent().url, 'https://api.test/operations')
  assert.equal(sent().method, 'POST')
  assert.equal(sent().accept, ATOMIC_MEDIA_TYPE)
  assert.equal(sent().contentType, ATOMIC_MEDIA_TYPE)
})

test('honors a custom endpoint', async () => {
  const { api, sent } = client(undefined, 200, { endpoint: 'bulk' })

  await api.atomic(op => [op.remove('article', '13')])

  assert.equal(sent().url, 'https://api.test/bulk')
})

test('creates a resource', async () => {
  assert.deepEqual(
    await operations(op => [
      op.add('article', { title: 'JSON API paints my bikeshed!' })
    ]),
    [{
      op: 'add',
      data: {
        type: 'articles',
        attributes: { title: 'JSON API paints my bikeshed!' }
      }
    }]
  )
})

test('creates a resource at an href', async () => {
  assert.deepEqual(
    await operations(op => [
      op.add(
        'article',
        { title: 'JSON API paints my bikeshed!' },
        { href: '/blogPosts' }
      )
    ]),
    [{
      op: 'add',
      href: '/blogPosts',
      data: {
        type: 'articles',
        attributes: { title: 'JSON API paints my bikeshed!' }
      }
    }]
  )
})

test('updates a resource', async () => {
  assert.deepEqual(
    await operations(op => [
      op.update('article', { id: '13', title: 'To TDD or Not' })
    ]),
    [{
      op: 'update',
      data: {
        type: 'articles',
        id: '13',
        attributes: { title: 'To TDD or Not' }
      }
    }]
  )
})

test('deletes a resource', async () => {
  assert.deepEqual(
    await operations(op => [op.remove('article', '13')]),
    [{ op: 'remove', ref: { type: 'articles', id: '13' } }]
  )
})

test('assigns and clears a to-one relationship', async () => {
  const ref = { type: 'articles', id: '13', relationship: 'author' }

  assert.deepEqual(
    await operations(op => [
      op.update(ref, { type: 'people', id: '9' }),
      op.update(ref, null)
    ]),
    [
      { op: 'update', ref, data: { type: 'people', id: '9' } },
      { op: 'update', ref, data: null }
    ]
  )
})

test('adds, replaces, and removes to-many members', async () => {
  const comments = {
    type: 'articles',
    id: '1',
    relationship: 'comments'
  }

  const tags = { type: 'articles', id: '1', relationship: 'tags' }

  assert.deepEqual(
    await operations(op => [
      op.add(comments, [{ type: 'comments', id: '123' }]),
      op.update(tags, [
        { type: 'tags', id: '2' },
        { type: 'tags', id: '3' }
      ]),
      op.remove(comments, [
        { type: 'comments', id: '12' },
        { type: 'comments', id: '13' }
      ])
    ]),
    [
      {
        op: 'add',
        ref: comments,
        data: [{ type: 'comments', id: '123' }]
      },
      {
        op: 'update',
        ref: tags,
        data: [{ type: 'tags', id: '2' }, { type: 'tags', id: '3' }]
      },
      {
        op: 'remove',
        ref: comments,
        data: [
          { type: 'comments', id: '12' },
          { type: 'comments', id: '13' }
        ]
      }
    ]
  )
})

test('links two new resources through a lid', async () => {
  assert.deepEqual(
    await operations(op => [
      op.add('author', { lid: 'a1', name: 'dgeb' }),
      op.add('article', {
        title: 'JSON API paints my bikeshed!',
        author: { type: 'authors', lid: 'a1' }
      })
    ]),
    [
      {
        op: 'add',
        data: {
          type: 'authors',
          lid: 'a1',
          attributes: { name: 'dgeb' }
        }
      },
      {
        op: 'add',
        data: {
          type: 'articles',
          attributes: { title: 'JSON API paints my bikeshed!' },
          relationships: {
            author: { data: { type: 'authors', lid: 'a1' } }
          }
        }
      }
    ]
  )
})

test('carries operation meta', async () => {
  assert.deepEqual(
    await operations(op => [
      op.remove('article', '13', { meta: { reason: 'spam' } })
    ]),
    [{
      op: 'remove',
      ref: { type: 'articles', id: '13' },
      meta: { reason: 'spam' }
    }]
  )
})

test('raw passes an operation through untouched', async () => {
  const operation: Operation = {
    op: 'add',
    href: '/anything',
    data: { type: 'not-cased', attributes: {} }
  }

  assert.deepEqual(
    await operations(op => [op.raw(operation)]),
    [operation]
  )
})

test('sends the top-level document members', async () => {
  const { api, sent } = client()

  await api.atomic(
    op => [op.remove('article', '13')],
    { document: { meta: { batch: 'nightly' } } }
  )

  assert.deepEqual(sent().document.meta, { batch: 'nightly' })
})

test('flattens each result, in order', async () => {
  const { api } = client({
    'atomic:results': [
      {
        data: {
          type: 'authors',
          id: '9',
          attributes: { name: 'dgeb' }
        }
      },
      { data: null },
      {}
    ],
    'meta': { count: 3 }
  })

  const { results, meta, status } = await api.atomic(op => [
    op.add('author', { name: 'dgeb' }),
    op.remove('author', '8'),
    op.remove('author', '7')
  ])

  assert.deepEqual(results, [
    { type: 'authors', id: '9', name: 'dgeb' },
    null,
    null
  ])

  assert.deepEqual(meta, { count: 3 })
  assert.equal(status, 200)
})

test('a 204 answers with no results', async () => {
  const { api } = client(undefined, 204)

  const { results, status } = await api.atomic(op => [
    op.remove('article', '13')
  ])

  assert.deepEqual(results, [])
  assert.equal(status, 204)
})

test('keeps the raw document alongside the results', async () => {
  const results = [{ data: null, meta: { skipped: true } }]
  const document = { 'atomic:results': results }

  const { api } = client(document)
  const response = await api.atomic(op => [op.remove('article', '13')])

  assert.deepEqual(response.document['atomic:results'], [
    { data: null, meta: { skipped: true } }
  ])
})

test('an operation cannot sidepost', async () => {
  const { api } = client()

  await assert.rejects(
    () => api.atomic(op => [
      op.add('article', {
        title: 'Hello',
        author: { type: 'authors', id: '9', name: 'Ann' }
      })
    ]),
    /cannot sidepost/
  )
})

test('an operation is targeted by ref or href, never both', async () => {
  const { api } = client()

  await assert.rejects(
    () => api.atomic(op => [
      op.remove(
        { type: 'articles', id: '1' },
        { href: '/articles/1' }
      )
    ]),
    /not both/
  )
})

test('an error document keeps its operation pointers', async () => {
  const { api } = client(
    {
      errors: [{
        status: '422',
        source: { pointer: '/atomic:operations/1/data/attributes/title' }
      }]
    },
    422
  )

  await assert.rejects(
    () => api.atomic(op => [
      op.add('article', { title: '' }),
      op.add('article', { title: '' })
    ]),
    (error: unknown) => {
      assert.ok(error instanceof FetchjaError)
      assert.equal(error.status, 422)
      assert.equal(
        error.errors?.[0]?.source?.pointer,
        '/atomic:operations/1/data/attributes/title'
      )

      return true
    }
  )
})
