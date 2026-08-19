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

test('adds -es to words ending in "ss"', () => {
  assert.equal(pluralize('address'), 'addresses')
  assert.equal(pluralize('class'), 'classes')
  assert.equal(pluralize('addresses'), 'addresses')
})

test('handles consonant + y', () => {
  assert.equal(pluralize('category'), 'categories')
  assert.equal(pluralize('day'), 'days')
})

test('handles common irregulars', () => {
  assert.equal(pluralize('person'), 'people')
  assert.equal(pluralize('child'), 'children')
  assert.equal(pluralize('people'), 'people')
  assert.equal(pluralize('children'), 'children')
})

test('swaps "is" for "es"', () => {
  assert.equal(pluralize('analysis'), 'analyses')
  assert.equal(pluralize('diagnosis'), 'diagnoses')
  assert.equal(pluralize('analyses'), 'analyses')
})

test('keeps uncountables unchanged', () => {
  assert.equal(pluralize('equipment'), 'equipment')
  assert.equal(pluralize('information'), 'information')
  assert.equal(pluralize('media'), 'media')
  assert.equal(pluralize('cash'), 'cash')
  assert.equal(pluralize('staff'), 'staff')
})

test('returns empty string unchanged', () => {
  assert.equal(pluralize(''), '')
})
