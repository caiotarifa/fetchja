import { test } from 'node:test'
import assert from 'node:assert/strict'

import { pluralize } from '../src/pluralize.js'

test('adds -s to regular words', () => {
  assert.equal(pluralize('post'), 'posts')
  assert.equal(pluralize('user'), 'users')
})

test('is idempotent for already-plural words', () => {
  assert.equal(pluralize('posts'), 'posts')
  assert.equal(pluralize('users'), 'users')
})

test('adds -es after s/x/z/ch/sh', () => {
  assert.equal(pluralize('box'), 'boxes')
  assert.equal(pluralize('match'), 'matches')
})

test('adds -es to words ending in "us"', () => {
  assert.equal(pluralize('status'), 'statuses')
  assert.equal(pluralize('bus'), 'buses')
  assert.equal(pluralize('virus'), 'viruses')
})

test('keeps already-plural "us" words unchanged', () => {
  assert.equal(pluralize('statuses'), 'statuses')
})

test('handles consonant + y', () => {
  assert.equal(pluralize('category'), 'categories')
  assert.equal(pluralize('day'), 'days')
})

test('returns empty string unchanged', () => {
  assert.equal(pluralize(''), '')
})
