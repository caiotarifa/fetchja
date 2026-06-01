import { test } from 'node:test'
import assert from 'node:assert/strict'

import Fetchja from '../src/client.js'
import { FetchjaError } from '../src/errors.js'

const JSON_API = 'application/vnd.api+json'

function jsonResponse (body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': JSON_API }
  })
}

test('get builds a normalized URL and deserializes', async () => {
  const calls: string[] = []

  const api = new Fetchja({
    baseURL: 'https://api.test',
    fetch: async url => {
      calls.push(String(url))

      return jsonResponse({
        data: { type: 'posts', id: '1', attributes: { title: 'Hi' } }
      })
    }
  })

  const result = await api.get('post')

  assert.equal(calls[0], 'https://api.test/posts')
  assert.equal((result.data as Record<string, unknown>).title, 'Hi')
})

test('post serializes the body', async () => {
  const sent: string[] = []

  const api = new Fetchja({
    baseURL: 'https://api.test',

    fetch: async (_url, init) => {
      sent.push(String(init?.body))

      return jsonResponse({ data: { type: 'posts', id: '1' } })
    }
  })

  await api.post('post', { title: 'Hi' })
  assert.match(sent[0] ?? '', /"attributes":\{"title":"Hi"\}/)
})

test('throws FetchjaError on a non-OK response', async () => {
  const api = new Fetchja({
    baseURL: 'https://api.test',
    fetch: async () =>
      jsonResponse({ errors: [{ detail: 'Nope' }] }, 422)
  })

  await assert.rejects(api.get('post'), (error: FetchjaError) => {
    assert.equal(error.status, 422)
    assert.deepEqual(error.errors, [{ detail: 'Nope' }])

    return true
  })
})

test('onResponseError can replay the request', async () => {
  let attempt = 0

  const api = new Fetchja({
    baseURL: 'https://api.test',

    fetch: async () => {
      attempt += 1

      return attempt === 1
        ? jsonResponse({ errors: [{ detail: 'x' }] }, 401)
        : jsonResponse({ data: { type: 'posts', id: '1' } })
    },

    onResponseError: response =>
      (response as Response & { replayRequest: () => Promise<Response> })
        .replayRequest()
  })

  const result = await api.get('post')

  assert.equal((result.data as Record<string, unknown>).id, '1')
  assert.equal(attempt, 2)
})

test('throws FetchjaError when baseURL is missing', async () => {
  const api = new Fetchja()

  await assert.rejects(api.get('post'), /baseURL/)
})

test('exposes method aliases', () => {
  const api = new Fetchja({ baseURL: 'https://api.test' })

  assert.equal(api.fetch, api.get)
  assert.equal(api.create, api.post)
  assert.equal(api.update, api.patch)
  assert.equal(api.remove, api.delete)
})

test('delete targets the id without a body', async () => {
  const calls: { url: string, method?: string, body: unknown }[] = []

  const api = new Fetchja({
    baseURL: 'https://api.test',

    fetch: async (url, init) => {
      calls.push({
        url: String(url),
        method: init?.method,
        body: init?.body
      })

      return jsonResponse({ meta: { ok: true } })
    }
  })

  await api.remove('article', '1')
  assert.equal(calls[0]?.url, 'https://api.test/articles/1')
  assert.equal(calls[0]?.method, 'DELETE')
  assert.equal(calls[0]?.body, undefined)
})

test('patch appends the id from the body', async () => {
  const calls: string[] = []
  const api = new Fetchja({
    baseURL: 'https://api.test',
    fetch: async url => {
      calls.push(String(url))

      return jsonResponse({ data: { type: 'articles', id: '1' } })
    }
  })

  await api.update('article', { id: '1', title: 'x' })
  assert.equal(calls[0], 'https://api.test/articles/1')
})

test('get and post build the same url for a namespaced model', async () => {
  const urls: string[] = []

  const api = new Fetchja({
    baseURL: 'https://api.test',

    fetch: async url => {
      urls.push(String(url))

      return jsonResponse({ data: { type: 'posts', id: '1' } })
    }
  })

  await api.get('admin/post')
  await api.post('admin/post', { title: 'x' })

  assert.equal(urls[0], 'https://api.test/admin/posts')
  assert.equal(urls[0], urls[1])
})

test('resourceCase transforms the resource name', async () => {
  const urls: string[] = []

  const api = new Fetchja({
    baseURL: 'https://api.test',
    resourceCase: 'kebab',
    pluralize: false,

    fetch: async url => {
      urls.push(String(url))

      return jsonResponse({ data: { type: 'blogPosts', id: '1' } })
    }
  })

  await api.get('blogPost')
  assert.equal(urls[0], 'https://api.test/blog-post')
})

test('typeCase controls the serialized type name', async () => {
  const sent: string[] = []

  const api = new Fetchja({
    baseURL: 'https://api.test',
    typeCase: 'kebab',

    fetch: async (_url, init) => {
      sent.push(String(init?.body))

      return jsonResponse({ data: { type: 'blog-posts', id: '1' } })
    }
  })

  await api.post('blogPost', { title: 'x' })
  assert.match(sent[0] ?? '', /"type":"blog-posts"/)
})
