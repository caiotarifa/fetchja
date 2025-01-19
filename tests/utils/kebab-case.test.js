import assert from 'assert'
import { kebabCase } from '../../src/utils/kebab-case.js'

// Test 1: camelCase to kebab-case.
assert.strictEqual(
  kebabCase('helloWorld'),
  'hello-world',
  'Should convert camelCase to kebab-case.'
)

// Test 2: snake_case to kebab-case.
assert.strictEqual(
  kebabCase('hello_world'),
  'hello-world',
  'Should convert snake_case to kebab-case.'
)

// Test 3: Mixed case to kebab-case.
assert.strictEqual(
  kebabCase('HELLO_WORLD_123'),
  'hello-world-123',
  'Should convert mixed case to kebab-case.'
)

// Test 4: Empty string.
assert.strictEqual(
  kebabCase(''),
  '',
  'Should return an empty string.'
)
