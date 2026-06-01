/**
 * Property names that could pollute an object's prototype. They are
 * skipped whenever data from a response is copied into a new object.
 */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * A single JSON:API resource object.
 */
export interface Resource {
  /** The resource type. */
  type?: string

  /** The resource id. */
  id?: string

  /** The resource attributes. */
  attributes?: Record<string, unknown>

  /** The resource relationships. */
  relationships?: Record<string, { data?: unknown }>
}

/**
 * Flatten a JSON:API resource (or array of resources) by lifting its
 * `attributes` and `relationships` onto the top level, next to `type`
 * and `id`.
 *
 * @param data - The resource or resources to flatten.
 * @returns The flattened object or array of objects.
 */
export function deattribute (
  data: Resource | Resource[]
): Record<string, unknown> | Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.map(item => deattribute(item) as Record<string, unknown>)
  }

  const output: Record<string, unknown> = {
    type: data.type,
    id: data.id
  }

  for (const key in data.attributes) {
    if (DANGEROUS_KEYS.has(key)) {
      continue
    }

    output[key] = data.attributes[key]
  }

  for (const key in data.relationships) {
    if (DANGEROUS_KEYS.has(key)) {
      continue
    }

    const relation = data.relationships[key]

    if (relation && 'data' in relation) {
      output[key] = relation.data
    }
  }

  return output
}
