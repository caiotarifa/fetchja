/**
 * Property names that could pollute an object's prototype. They are
 * skipped while reading the parameters object.
 */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * Check whether a value should be walked into when building the query.
 * Arrays and plain objects are traversable; `Date` instances are not.
 *
 * @param value - The value to check.
 * @returns `true` when the value should be traversed.
 */
function isTraversable (value: unknown): value is object {
  return (
    typeof value === 'object' &&
    value !== null &&
    !(value instanceof Date)
  )
}

/**
 * Append an object's entries to a query, recursing into nested objects
 * and arrays using JSON:API-friendly bracket notation.
 *
 * @param query - The query to append to.
 * @param object - The object or array to walk.
 * @param prefix - The key prefix built from parent keys.
 */
function buildQuery (
  query: URLSearchParams,
  object: object,
  prefix = ''
): void {
  const isArray = Array.isArray(object)

  for (const key in object) {
    if (DANGEROUS_KEYS.has(key)) {
      continue
    }

    const value = (object as Record<string, unknown>)[key]
    const path = prefix ? `${prefix}[${isArray ? '' : key}]` : key

    if (isTraversable(value)) {
      buildQuery(query, value, path)
    } else {
      query.append(path, String(value))
    }
  }
}

/**
 * Serialize a plain object into URL query parameters.
 *
 * @param parameters - The parameters to serialize.
 * @returns The serialized query parameters.
 */
export function queryFormatter (
  parameters: Record<string, unknown> = {}
): URLSearchParams {
  const query = new URLSearchParams()

  buildQuery(query, parameters)

  return query
}
