import type {
  JsonApiLinks,
  JsonApiMeta,
  JsonApiRelationship,
  ResourceEnvelope
} from './jsonapi.js'

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

  /** The local id of a client-generated resource. */
  lid?: string

  /** The resource attributes. */
  attributes?: Record<string, unknown>

  /** The resource relationships. */
  relationships?: Record<string, JsonApiRelationship>

  /** The resource links. */
  links?: JsonApiLinks

  /** Non-standard information about the resource. */
  meta?: JsonApiMeta

  [key: string]: unknown
}

/**
 * Check whether any identifier of a resource linkage carries its own
 * `meta`. Identifier `meta` only exists on the raw linkage, so it is the
 * one part of a relationship the flattened value cannot hold.
 *
 * @param linkage - The resource linkage to check.
 * @returns `true` when an identifier carries `meta`.
 */
function hasIdentifierMeta (linkage: unknown): boolean {
  if (Array.isArray(linkage)) {
    return linkage.some(hasIdentifierMeta)
  }

  return (
    typeof linkage === 'object' &&
    linkage !== null &&
    'meta' in linkage
  )
}

/**
 * Strip the `meta` of every identifier in a resource linkage. The flat
 * value has to stay a bare identifier, so it can be sent back as-is;
 * the raw linkage keeps the `meta` under `$`.
 *
 * @param linkage - The resource linkage to strip.
 * @returns The linkage, without any identifier `meta`.
 */
function withoutIdentifierMeta (linkage: unknown): unknown {
  if (Array.isArray(linkage)) {
    return linkage.map(withoutIdentifierMeta)
  }

  if (!hasIdentifierMeta(linkage)) {
    return linkage
  }

  const identifier = { ...linkage as Record<string, unknown> }

  delete identifier.meta

  return identifier
}

/**
 * Flatten a JSON:API resource (or array of resources) by lifting its
 * `attributes` and `relationships` onto the top level, next to `type`
 * and `id`.
 *
 * Everything else the specification defines — `meta`, `links`, `lid`,
 * relationship `meta` and `links`, identifier `meta`, and any extension
 * member — is kept under the reserved `$` key, which is omitted when
 * there is nothing to carry. The specification forbids `$` in member
 * names, so `$` never collides with an attribute or a relationship.
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

  const { type, id, attributes, relationships, ...extra } = data

  const output: Record<string, unknown> = { type }
  const envelope: ResourceEnvelope = { ...extra }
  const envelopeRelationships: Record<string, JsonApiRelationship> = {}

  // A client-generated resource has a `lid` and no `id`, so `id` is only
  // set when the resource actually has one.
  if (id !== undefined) {
    output.id = id
  }

  for (const key in attributes) {
    if (DANGEROUS_KEYS.has(key)) {
      continue
    }

    output[key] = attributes[key]
  }

  for (const key in relationships) {
    if (DANGEROUS_KEYS.has(key)) {
      continue
    }

    const relation = relationships[key]

    if (!relation) {
      continue
    }

    const { data: linkage, ...rest } = relation

    if ('data' in relation) {
      output[key] = withoutIdentifierMeta(linkage)
    }

    if (hasIdentifierMeta(linkage)) {
      rest.data = linkage
    }

    if (Object.keys(rest).length > 0) {
      envelopeRelationships[key] = rest
    }
  }

  if (Object.keys(envelopeRelationships).length > 0) {
    envelope.relationships = envelopeRelationships
  }

  if (Object.keys(envelope).length > 0) {
    output.$ = envelope
  }

  return output
}
