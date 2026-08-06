import { deattribute } from './deattribute.js'

/**
 * Check whether a value is a non-null object.
 *
 * @param value - The value to check.
 * @returns `true` when the value is a non-null object.
 */
function isObject (value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** The top-level document members passed through to the caller. */
const DOCUMENT_MEMBERS = ['meta', 'links', 'jsonapi'] as const

/**
 * Deserialize a JSON:API response document into a flat object. Resources
 * found in `included` are resolved (by `type` and `id`) straight into
 * the relationships that reference them.
 *
 * @param response - The JSON:API document to deserialize.
 * @returns The flattened response, with `data` and the top-level `meta`,
 *   `links`, and `jsonapi` members the document carried.
 */
export function deserialize (
  response: Record<string, any>
): Record<string, unknown> {
  const output: Record<string, unknown> = {}

  if (response.data) {
    output.data = deattribute(response.data)
  }

  for (const member of DOCUMENT_MEMBERS) {
    if (response[member]) {
      output[member] = response[member]
    }
  }

  if (!Array.isArray(response.included)) {
    return output
  }

  const resourcesByKey = new Map<string, Record<string, unknown>>()

  for (const resource of response.included) {
    const flat = deattribute(resource) as Record<string, unknown>

    resourcesByKey.set(`${resource.type}:${resource.id}`, flat)
  }

  /**
   * Replace a resource identifier with its full resource, when known.
   *
   * @param reference - The identifier or value to resolve.
   * @returns The resolved resource, or the value unchanged.
   */
  function resolve (reference: unknown): unknown {
    if (!isObject(reference)) {
      return reference
    }

    return resourcesByKey.get(`${reference.type}:${reference.id}`) ??
      reference
  }

  /**
   * Resolve a relationship value, mapping over to-many arrays.
   *
   * @param value - The relationship value to resolve.
   * @returns The resolved value.
   */
  function replace (value: unknown): unknown {
    return Array.isArray(value) ? value.map(resolve) : resolve(value)
  }

  /**
   * Resolve every relationship reference on a flattened resource.
   *
   * @param entry - The flattened resource to link.
   */
  function link (entry: Record<string, unknown>): void {
    for (const key in entry) {
      // `$` holds the raw JSON:API members, which are kept untouched.
      if (key === '$') {
        continue
      }

      if (isObject(entry[key])) {
        entry[key] = replace(entry[key])
      }
    }
  }

  for (const resource of resourcesByKey.values()) {
    link(resource)
  }

  const { data } = output

  if (Array.isArray(data)) {
    data.forEach(link)
  } else if (isObject(data)) {
    link(data)
  }

  return output
}
