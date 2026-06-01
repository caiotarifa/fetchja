import { test } from 'node:test'
import assert from 'node:assert/strict'

import { normalizePath, splitModel } from '../src/model.js'

function identity (value: string): string {
  return value
}

const opts = { resourceCase: identity, pluralize: identity }

test('normalizePath cases and pluralizes each segment', () => {
  const upper = {
    resourceCase: identity,
    pluralize: (s: string) => `${s}s`
  }

  assert.equal(normalizePath('post', upper), 'posts')
  assert.equal(normalizePath('/post', upper), 'posts')
})

test('normalizePath leaves numeric id segments alone', () => {
  const plural = { resourceCase: identity, pluralize: (s: string) => `${s}s` }

  assert.equal(normalizePath('post/1', plural), 'posts/1')
})

test('splitModel returns [type, url]', () => {
  assert.deepEqual(splitModel('posts', opts), ['posts', 'posts'])
  assert.deepEqual(
    splitModel('admin/posts', opts),
    ['posts', 'admin/posts']
  )
})

test('normalizePath stays consistent with splitModel url', () => {
  const o = { resourceCase: identity, pluralize: (s: string) => `${s}s` }

  assert.equal(normalizePath('admin/post', o), 'admin/posts')
  assert.equal(
    normalizePath('admin/post', o),
    splitModel('admin/post', o)[1]
  )
})
