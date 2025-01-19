import assert from 'assert'
import { camelCase } from '../../src/utils/camel-case.js'

// Test 1: snake_case to camelCase.
assert.strictEqual(
  camelCase('hello_world'),
  'helloWorld',
  'Should convert snake_case to camelCase.'
)

// Test 2: kebab-case to camelCase.
assert.strictEqual(
  camelCase('hello-world'),
  'helloWorld',
  'Should convert kebab-case to camelCase.'
)

// Test 3: Mixed case to camelCase.
assert.strictEqual(
  camelCase('HELLO_WORLD_123'),
  'helloWorld123',
  'Should convert mixed case to camelCase.'
)

 // Test 4: Empty string.
assert.strictEqual(
  camelCase(''),
  '',
  'Should return an empty string.'
)
