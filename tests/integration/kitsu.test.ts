import { test } from 'node:test'
import assert from 'node:assert/strict'

import Fetchja from '../../src/client.js'

/**
 * End-to-end tests against the public Kitsu JSON:API.
 *
 * Kitsu (https://kitsu.io/api/edge) is read-only for anonymous clients,
 * so these tests exercise the full GET path — query serialization, the
 * request pipeline and JSON:API deserialization — against real
 * responses. Each test also captures the outgoing URL so the exact
 * query string built by the client can be asserted, not just inferred
 * from the server's behaviour.
 *
 * They require network access and run only via
 * `npm run test:integration`, never as part of `npm test`.
 */

const REQUEST_TIMEOUT = 30000

/**
 * Build a client pointed at Kitsu that records every outgoing request
 * URL, so tests can assert the serialized query string.
 *
 * @returns The client and the list of captured URLs.
 */
function createApi (): { api: Fetchja, urls: string[] } {
  const urls: string[] = []

  const api = new Fetchja({
    baseURL: 'https://kitsu.io/api/edge',
    // `anime` is uncountable and Kitsu types already arrive in their
    // final form, so disable pluralization and leave names untouched.
    pluralize: false,
    resourceCase: 'none',

    fetch: (input, init) => {
      urls.push(String(input))

      return fetch(input, init)
    }
  })

  return { api, urls }
}

/**
 * Return the decoded query string of a captured URL, so bracketed
 * JSON:API keys can be matched without percent-encoding noise.
 *
 * @param url - The captured request URL.
 * @returns The decoded `search` portion (without the leading `?`).
 */
function queryOf (url: string): string {
  return decodeURIComponent(new URL(url).search).replace(/^\?/, '')
}

test('reads a paginated collection', {
  timeout: REQUEST_TIMEOUT
}, async () => {
  const { api, urls } = createApi()

  const result = await api.get('anime', {
    params: { page: { limit: 3 } }
  })

  // The query was serialized with the JSON:API bracket notation.
  assert.equal(queryOf(urls[0] ?? ''), 'page[limit]=3')

  const data = result.data as Record<string, unknown>[]
  const meta = result.meta as Record<string, unknown>

  assert.ok(Array.isArray(data))
  assert.equal(data.length, 3)

  for (const item of data) {
    assert.equal(item.type, 'anime')
    assert.equal(typeof item.id, 'string')
    assert.equal(typeof item.slug, 'string')

    // Relationships arrive without a `data` member, so they are not
    // lifted onto the flattened resource.
    assert.equal('categories' in item, false)
  }

  assert.equal(typeof meta.count, 'number')
  assert.ok((meta.count as number) > 0)
  assert.ok(result.headers)

  // The document links carry pagination.
  const links = result.links as Record<string, string>

  assert.match(queryOf(links.first ?? ''), /page\[limit]=3/)
  assert.match(queryOf(links.next ?? ''), /page\[offset]=3/)
})

test('reads a single resource and flattens it cleanly', {
  timeout: REQUEST_TIMEOUT
}, async () => {
  const { api, urls } = createApi()
  const result = await api.get('anime/1')

  assert.equal(queryOf(urls[0] ?? ''), '')

  const data = result.data as Record<string, unknown>

  assert.equal(data.type, 'anime')
  assert.equal(data.id, '1')
  assert.equal(data.slug, 'cowboy-bebop')

  // The JSON:API envelope keys are lifted away, never left on the
  // flattened resource.
  assert.equal('attributes' in data, false)
  assert.equal('relationships' in data, false)
  assert.equal('links' in data, false)

  // They are kept under `$` instead: the resource's own links, and the
  // links of every relationship Kitsu sends without linkage.
  const envelope = data.$ as Record<string, any>

  assert.match(String(envelope.links.self), /anime\/1$/)
  assert.match(
    String(envelope.relationships.categories.links.related),
    /anime\/1\/categories$/
  )
  assert.equal('data' in envelope.relationships.categories, false)
})

test('filters a collection', {
  timeout: REQUEST_TIMEOUT
}, async () => {
  const { api, urls } = createApi()

  const result = await api.get('anime', {
    params: {
      filter: { text: 'naruto' },
      page: { limit: 3 }
    }
  })

  const query = queryOf(urls[0] ?? '')

  assert.match(query, /filter\[text]=naruto/)
  assert.match(query, /page\[limit]=3/)

  const data = result.data as Record<string, unknown>[]

  assert.ok(Array.isArray(data))
  assert.ok(data.length > 0)

  const matches = data.some(item =>
    /naruto/i.test(String(item.canonicalTitle ?? ''))
  )

  assert.ok(matches, 'expected at least one title to match /naruto/i')
})

test('serializes a complex query and honors it', {
  timeout: REQUEST_TIMEOUT
}, async () => {
  const { api, urls } = createApi()

  const result = await api.get('anime', {
    params: {
      sort: ['-averageRating'],
      fields: { anime: ['slug', 'averageRating'] },
      page: { limit: 3, offset: 2 }
    }
  })

  const query = queryOf(urls[0] ?? '')

  // Scalar arrays (`sort`, `fields[anime]`) are comma-joined; nested
  // objects (`fields[anime]`, `page[...]`) use bracket notation.
  assert.match(query, /sort=-averageRating/)
  assert.match(query, /fields\[anime]=slug,averageRating/)
  assert.match(query, /page\[limit]=3/)
  assert.match(query, /page\[offset]=2/)

  const data = result.data as Record<string, unknown>[]

  assert.equal(data.length, 3)

  for (const item of data) {
    // The sparse fieldset is respected and flattening is exact: only
    // the requested attributes survive next to `type`, `id`, and the
    // `$` envelope holding the resource's own JSON:API members.
    assert.deepEqual(
      Object.keys(item).sort(),
      ['$', 'averageRating', 'id', 'slug', 'type']
    )
  }

  // The `-averageRating` sort is reflected in the returned order.
  const ratings = data.map(item => Number(item.averageRating))

  for (let index = 1; index < ratings.length; index += 1) {
    assert.ok(
      ratings[index - 1]! >= ratings[index]!,
      'expected averageRating to be sorted descending'
    )
  }
})

test('resolves an included to-many relationship', {
  timeout: REQUEST_TIMEOUT
}, async () => {
  const { api, urls } = createApi()

  const result = await api.get('anime/1', {
    params: { include: ['categories'] }
  })

  assert.equal(queryOf(urls[0] ?? ''), 'include=categories')

  const data = result.data as Record<string, unknown>
  const categories = data.categories as Record<string, unknown>[]

  assert.ok(Array.isArray(categories))
  assert.ok(categories.length > 0)

  for (const category of categories) {
    assert.equal(category.type, 'categories')
    assert.equal(typeof category.id, 'string')

    // Each identifier was resolved from `included` into the full
    // resource, not left as a bare `{ type, id }` pair.
    assert.equal(typeof category.title, 'string')
    assert.equal(typeof category.slug, 'string')
    assert.equal('attributes' in category, false)
  }
})

test('resolves an included to-one relationship', {
  timeout: REQUEST_TIMEOUT
}, async () => {
  const { api, urls } = createApi()

  const result = await api.get('categories', {
    params: {
      filter: { slug: 'shounen' },
      include: ['parent']
    }
  })

  const query = queryOf(urls[0] ?? '')

  assert.match(query, /filter\[slug]=shounen/)
  assert.match(query, /include=parent/)

  const data = result.data as Record<string, unknown>[]

  assert.equal(data.length, 1)

  const parent = data[0]!.parent as Record<string, unknown>

  // A to-one relationship resolves to a single object, not an array.
  assert.ok(!Array.isArray(parent))
  assert.equal(parent.type, 'categories')
  assert.equal(parent.slug, 'target-demographics')
})
