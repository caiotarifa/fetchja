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

test('joins top-level array values with commas', () => {
  const q = queryFormatter({ include: ['author', 'comments'] })

  assert.equal(q.get('include'), 'author,comments')
  assert.equal(q.getAll('include[]').length, 0)
})

test('passes comma-separated strings through unchanged', () => {
  const q = queryFormatter({ include: 'author,comments' })

  assert.equal(q.get('include'), 'author,comments')
})

test('joins sort arrays with commas', () => {
  const q = queryFormatter({ sort: ['-createdAt', 'title'] })

  assert.equal(q.get('sort'), '-createdAt,title')
})

test('joins sparse fieldset arrays with commas', () => {
  const q = queryFormatter({ fields: { articles: ['title', 'body'] } })

  assert.equal(q.get('fields[articles]'), 'title,body')
})

test('omits empty arrays', () => {
  const q = queryFormatter({ include: [], sort: 'name' })

  assert.equal(q.has('include'), false)
  assert.equal(q.get('sort'), 'name')
})

// Filter complexity: medium — several scalar filters side by side.
test('formats multiple scalar filters', () => {
  const q = queryFormatter({ filter: { status: 'active', authorId: 5 } })

  assert.equal(q.get('filter[status]'), 'active')
  assert.equal(q.get('filter[authorId]'), '5')
})

// Filter complexity: high — array of values joined with commas.
test('joins filter array values with commas', () => {
  const q = queryFormatter({ filter: { id: [1, 2, 3] } })

  assert.equal(q.get('filter[id]'), '1,2,3')
})

// Filter complexity: high — nested operator objects.
test('formats nested filter operators with brackets', () => {
  const q = queryFormatter({ filter: { price: { gte: 10, lte: 100 } } })

  assert.equal(q.get('filter[price][gte]'), '10')
  assert.equal(q.get('filter[price][lte]'), '100')
})

// Filter complexity: very high — array nested inside an operator object.
test('joins arrays nested inside filter operators', () => {
  const q = queryFormatter({ filter: { tags: { any: ['news', 'tech'] } } })

  assert.equal(q.get('filter[tags][any]'), 'news,tech')
})

// Filter complexity: very high — array of objects (boolean grouping)
// falls back to indexed bracket notation since it is not a scalar list.
test('formats arrays of objects with bracket recursion', () => {
  const q = queryFormatter({
    filter: { or: [{ status: 'active' }, { status: 'pending' }] }
  })

  assert.deepEqual(q.getAll('filter[or][][status]'), ['active', 'pending'])
})

// Filter complexity: very high — a realistic mix of every member type.
test('formats a deeply mixed query', () => {
  const q = queryFormatter({
    include: ['author', 'comments.author'],
    fields: { articles: ['title', 'body'], people: 'name' },
    filter: {
      published: true,
      price: { gte: 10, lte: 100 },
      tags: ['news', 'tech']
    },
    sort: ['-createdAt', 'title'],
    page: { number: 1, size: 10 }
  })

  assert.equal(q.get('include'), 'author,comments.author')
  assert.equal(q.get('fields[articles]'), 'title,body')
  assert.equal(q.get('fields[people]'), 'name')
  assert.equal(q.get('filter[published]'), 'true')
  assert.equal(q.get('filter[price][gte]'), '10')
  assert.equal(q.get('filter[price][lte]'), '100')
  assert.equal(q.get('filter[tags]'), 'news,tech')
  assert.equal(q.get('sort'), '-createdAt,title')
  assert.equal(q.get('page[number]'), '1')
  assert.equal(q.get('page[size]'), '10')
})

test('ignores prototype-polluting keys', () => {
  const q = queryFormatter(
    JSON.parse('{ "__proto__": { "x": 1 }, "ok": 2 }')
  )

  assert.equal(q.get('ok'), '2')
  assert.equal(({} as Record<string, unknown>).x, undefined)
})
