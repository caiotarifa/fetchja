import { test } from 'node:test'
import assert from 'node:assert/strict'

import { camelCase, kebabCase, snakeCase } from '../src/case.js'

test('camelCase converts snake and kebab', () => {
  assert.equal(camelCase('hello_world'), 'helloWorld')
  assert.equal(camelCase('hello-world'), 'helloWorld')
  assert.equal(camelCase('HELLO_WORLD_123'), 'helloWorld123')
  assert.equal(camelCase(''), '')
})

test('kebabCase converts camel and snake', () => {
  assert.equal(kebabCase('helloWorld'), 'hello-world')
  assert.equal(kebabCase('hello_world'), 'hello-world')
  assert.equal(kebabCase('HELLO_WORLD_123'), 'hello-world-123')
})

test('snakeCase converts camel and kebab', () => {
  assert.equal(snakeCase('helloWorld'), 'hello_world')
  assert.equal(snakeCase('hello-world'), 'hello_world')
  assert.equal(snakeCase('HELLO_WORLD_123'), 'hello_world_123')
})
