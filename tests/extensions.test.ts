import { test } from 'node:test'
import assert from 'node:assert/strict'

import Fetchja from '../src/client.js'
import { FetchjaError } from '../src/errors.js'
import {
  jsonApiMediaType,
  resolveExtensions,
  type Extension
} from '../src/extensions.js'

const JSON_API = 'application/vnd.api+json'

function jsonResponse (body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': JSON_API }
  })
}

test('jsonApiMediaType returns the bare media type by default', () => {
  assert.equal(jsonApiMediaType(), JSON_API)
  assert.equal(jsonApiMediaType({ ext: [] }), JSON_API)
})

test('jsonApiMediaType quotes and joins its parameters', () => {
  assert.equal(
    jsonApiMediaType({ ext: ['https://example.com/a'] }),
    `${JSON_API};ext="https://example.com/a"`
  )

  assert.equal(
    jsonApiMediaType({ ext: ['a', 'b'], profile: ['c'] }),
    `${JSON_API};ext="a b";profile="c"`
  )
})

test('resolveExtensions calls a bare factory', () => {
  const extension: Extension = { name: 'one' }

  function factory (): Extension {
    return extension
  }

  assert.deepEqual(resolveExtensions([factory]), [extension])
  assert.deepEqual(resolveExtensions([extension]), [extension])
})

test('resolveExtensions rejects a duplicate name', () => {
  assert.throws(
    () => resolveExtensions([{ name: 'one' }, { name: 'one' }]),
    FetchjaError
  )
})

test('an extension installs its methods on the client', async () => {
  const api = new Fetchja({
    baseURL: 'https://api.test',
    extensions: [
      {
        name: 'greeter',
        methods: client => ({
          greet: () => client.baseURL
        })
      }
    ]
  }) as Fetchja & { greet: () => string }

  assert.equal(api.greet(), 'https://api.test')
  assert.equal(api.extensions[0]?.name, 'greeter')
})

test('an extension cannot override a client member', () => {
  assert.throws(
    () => new Fetchja({
      baseURL: 'https://api.test',
      extensions: [
        { name: 'rogue', methods: () => ({ get: () => undefined }) }
      ]
    }),
    FetchjaError
  )
})

test('onRequest can rewrite the headers and the URL', async () => {
  let sent: { url: string, accept: string | null } | undefined

  const api = new Fetchja({
    baseURL: 'https://api.test',
    extensions: [
      {
        name: 'rewriter',
        onRequest: context => {
          context.headers.Accept = 'text/plain'
          context.url.searchParams.set('traced', '1')
        }
      }
    ],
    fetch: async (url, init) => {
      sent = {
        url: String(url),
        accept: new Headers(init?.headers).get('accept')
      }

      return jsonResponse({ data: { type: 'posts', id: '1' } })
    }
  })

  await api.get('post')

  assert.equal(sent?.url, 'https://api.test/posts?traced=1')
  assert.equal(sent?.accept, 'text/plain')
})

test('onResponse can replace the payload', async () => {
  const api = new Fetchja({
    baseURL: 'https://api.test',
    extensions: [
      {
        name: 'swapper',
        onResponse: () => ({
          data: { type: 'posts', id: '2', attributes: { title: 'Swapped' } }
        })
      }
    ],
    fetch: async () => jsonResponse({
      data: { type: 'posts', id: '1', attributes: { title: 'Original' } }
    })
  })

  const { data } = await api.get('post')

  assert.equal((data as Record<string, unknown>).title, 'Swapped')
})

test('onError sees the error before it is thrown', async () => {
  const seen: number[] = []

  const api = new Fetchja({
    baseURL: 'https://api.test',
    extensions: [
      {
        name: 'watcher',
        onError: error => {
          seen.push(error.status ?? 0)
        }
      }
    ],
    fetch: async () => jsonResponse(
      { errors: [{ status: '404' }] },
      404
    )
  })

  await assert.rejects(() => api.get('post/1'), FetchjaError)
  assert.deepEqual(seen, [404])
})

test('hooks run in registration order', async () => {
  const order: string[] = []

  const api = new Fetchja({
    baseURL: 'https://api.test',
    extensions: [
      { name: 'first', onRequest: () => { order.push('first') } },
      { name: 'second', onRequest: () => { order.push('second') } }
    ],
    fetch: async () => jsonResponse({ data: { type: 'posts', id: '1' } })
  })

  await api.get('post')

  assert.deepEqual(order, ['first', 'second'])
})

test('a string body is sent as it is', async () => {
  let body: unknown

  const api = new Fetchja({
    baseURL: 'https://api.test',
    fetch: async (_url, init) => {
      body = init?.body

      return jsonResponse({ data: { type: 'posts', id: '1' } })
    }
  })

  await api.request({ method: 'POST', url: 'anything', body: '{"raw":1}' })

  assert.equal(body, '{"raw":1}')
})

test('raw returns the document without flattening it', async () => {
  const api = new Fetchja({
    baseURL: 'https://api.test',
    fetch: async () => jsonResponse({
      data: { type: 'posts', id: '1', attributes: { title: 'Hi' } }
    })
  })

  const response = await api.request({ url: 'posts', raw: true })
  const data = response.data as Record<string, unknown>

  assert.deepEqual(data.attributes, { title: 'Hi' })
  assert.equal(data.title, undefined)
})
