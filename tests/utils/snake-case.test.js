import assert from 'assert'
import { snakeCase } from '../../src/utils/snake-case.js'

// Test 1: camelCase to snake_case.
assert.strictEqual(
  snakeCase('helloWorld'),
  'hello_world',
  'Should convert camelCase to snake_case.'
)

// Test 2: kebab-case to snake_case.
assert.strictEqual(
  snakeCase('hello-world'),
  'hello_world',
  'Should convert kebab-case to snake_case.'
)

// Test 3: Mixed case to snake_case.
assert.strictEqual(
  snakeCase('HELLO_WORLD_123'),
  'hello_world_123',
  'Should convert mixed case to snake_case.'
)

// Test 4: Empty string.
assert.strictEqual(
  snakeCase(''),
  '',
  'Should return an empty string.'
)
