import { FetchjaError } from './errors.js'
import type { JsonApiDocument } from './jsonapi.js'

/**
 * Property names that could pollute an object's prototype. They are
 * skipped while reading the input object.
 */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * The members a resource identifier is made of. A related resource that
 * carries nothing else has no place in `included`.
 */
const IDENTIFIER_MEMBERS = new Set(['type', 'id', 'lid'])

/**
 * The transforms applied to resource `type` names while serializing.
 */
export interface SerializeOptions {
  /** Cases a `type` name. */
  caseType: (type: string) => string

  /** Pluralizes a `type` name. */
  pluralTypes: (type: string) => string
}

/**
 * Check whether a value is a plain object. Arrays, `null`, and `Date`
 * instances are treated as values, not relationships.
 *
 * @param value - The value to check.
 * @returns `true` when the value is a plain object.
 */
function isPlainObject (
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  )
}

/**
 * Check whether an object means to be a relationship: any identifier
 * member marks the intent. An object carrying none of them is a plain
 * JSON attribute.
 *
 * @param value - The object to check.
 * @returns `true` when the object carries an identifier member.
 */
function isRelationshipObject (
  value: Record<string, unknown>
): boolean {
  return 'type' in value || 'id' in value || 'lid' in value
}

/**
 * Build a JSON:API resource object from a plain object. Nested objects
 * with an identifier member become relationships, and the full
 * resources are collected into a separate `included` list. A `$` key
 * holds the JSON:API members that have no place in the flat shape.
 *
 * Returns the parts rather than a document, so a caller that places a
 * resource somewhere other than a document's `data` — an extension
 * embedding it in an operation, say — can do so without reparsing.
 *
 * @param type - The resource type of the root object.
 * @param input - The plain object to serialize.
 * @param options - The type-name transforms.
 * @returns The resource object and the resources it pulled along.
 */
export function serializeResource (
  type: string,
  input: Record<string, unknown>,
  options: SerializeOptions
): {
  data: Record<string, unknown>
  included: Record<string, unknown>[]
} {
  const included: Record<string, unknown>[] = []
  const includedKeys = new Set<string>()

  /**
   * Apply the configured type-name transforms.
   *
   * @param rawType - The raw type name.
   * @returns The transformed type name.
   */
  function formatType (rawType: string): string {
    return options.pluralTypes(options.caseType(rawType))
  }

  /**
   * Resolve a resource's `type`: its own `type` when present, otherwise
   * one derived from the relationship key. Used for both the identifier
   * and the included resource, so the two always match.
   *
   * @param node - The resource.
   * @param fallbackType - The relationship key to fall back to.
   * @returns The resource type.
   */
  function resourceType (
    node: Record<string, unknown>,
    fallbackType: string
  ): string {
    return (node.type as string) ?? formatType(fallbackType)
  }

  /**
   * Build a JSON:API resource identifier (`{ type, id }`).
   *
   * @param resource - The related resource.
   * @param fallbackType - The type to use when the resource has none.
   * @returns The resource identifier.
   */
  function toIdentifier (
    resource: Record<string, unknown>,
    fallbackType: string
  ): Record<string, unknown> {
    const identifier: Record<string, unknown> = {
      type: resourceType(resource, fallbackType)
    }

    // A resource created client-side has no `id` yet; its `lid` links
    // the identifier to the full resource in `included`.
    if (resource.id != null) {
      identifier.id = String(resource.id)
    } else {
      identifier.lid = String(resource.lid)
    }

    return identifier
  }

  /**
   * Collect a related resource into `included`, de-duplicated by its
   * `type` and `id`. A resource that is nothing but an identifier is
   * left out: the linkage already carries it in full.
   *
   * @param resource - The related resource.
   * @param fallbackType - The type to use when the resource has none.
   */
  function collectIncluded (
    resource: unknown,
    fallbackType: string
  ): void {
    if (!isPlainObject(resource)) {
      return
    }

    if (resource.id == null && resource.lid == null) {
      throw new FetchjaError('All included resources must have an ID.')
    }

    // Sideposting an identifier says nothing the relationship has not
    // said already, and a server that validates `included` against its
    // schema rejects a resource with no attributes. The check runs
    // before `includedKeys`, so the same resource sent in full further
    // on is still collected.
    const carriesData = Object
      .keys(resource)
      .some(member => !IDENTIFIER_MEMBERS.has(member))

    if (!carriesData) {
      return
    }

    const key = resource.id != null
      ? `${resource.type ?? fallbackType}:id:${resource.id}`
      : `${resource.type ?? fallbackType}:lid:${resource.lid}`

    if (includedKeys.has(key)) {
      return
    }

    includedKeys.add(key)
    included.push(extractResource(resource, fallbackType))
  }

  /**
   * Build a JSON:API resource object from a plain object, splitting its
   * fields into `attributes` and `relationships`.
   *
   * @param node - The plain object to convert.
   * @param rawType - The raw type name of the resource.
   * @returns The JSON:API resource object.
   */
  function extractResource (
    node: Record<string, unknown>,
    rawType: string
  ): Record<string, unknown> {
    const data: Record<string, unknown> = {
      type: resourceType(node, rawType)
    }
    const relationships: Record<string, unknown> = {}
    const attributes: Record<string, unknown> = {}

    for (const key in node) {
      if (DANGEROUS_KEYS.has(key) || key === 'type' || key === '$') {
        continue
      }

      if (key === 'id' || key === 'lid') {
        // A missing value must not become the string `"undefined"`: a
        // client-generated resource carries only one of the two.
        if (node[key] != null) {
          data[key] = String(node[key])
        }

        continue
      }

      const value = node[key]

      if (Array.isArray(value)) {
        // Only a list of objects carrying identifier members is a
        // to-many relationship. A list of plain values or of plain JSON
        // objects is an attribute, which JSON:API allows. An empty list
        // still clears the relationship.
        if (
          value.length > 0 &&
          (
            !value.every(isPlainObject) ||
            !value.some(isRelationshipObject)
          )
        ) {
          attributes[key] = value

          continue
        }

        relationships[key] = {
          data: value.map(item => {
            collectIncluded(item, key)

            return toIdentifier(item, key)
          })
        }

        continue
      }

      if (isPlainObject(value)) {
        // An object with no identifier member at all is a plain JSON
        // attribute. One with a `type` or `lid` but a forgotten `id`
        // keeps throwing, so a half-written relationship stays a loud
        // error.
        if (!isRelationshipObject(value)) {
          attributes[key] = value

          continue
        }

        // An explicit `id: null` clears a to-one relationship.
        if (value.id === null) {
          relationships[key] = { data: null }

          continue
        }

        relationships[key] = { data: toIdentifier(value, key) }
        collectIncluded(value, key)

        continue
      }

      attributes[key] = value
    }

    // `$` carries the JSON:API members that have no place in the flat
    // shape: `meta`, `links`, `lid`, relationship `meta` and `links`,
    // and any extension member. They are emitted as they were given,
    // except for `type` and `id`, which the resource itself owns.
    const envelope = node.$
    let resource = data

    if (isPlainObject(envelope)) {
      const {
        attributes: rawAttributes,
        relationships: rawRelationships,
        ...members
      } = envelope
      const envelopeAttributes = rawAttributes as
        Record<string, unknown> | undefined
      const envelopeRelationships = rawRelationships as
        Record<string, unknown> | undefined

      resource = { ...data }

      for (const key in members) {
        if (
          DANGEROUS_KEYS.has(key) ||
          key === 'type' ||
          key === 'id'
        ) {
          continue
        }

        resource[key] = members[key]
      }

      // Envelope members merge per key over the derived ones, the same
      // way `relationships` below does, instead of replacing the whole
      // `attributes` object.
      for (const key in envelopeAttributes) {
        if (DANGEROUS_KEYS.has(key)) {
          continue
        }

        attributes[key] = envelopeAttributes[key]
      }

      for (const key in envelopeRelationships) {
        if (DANGEROUS_KEYS.has(key)) {
          continue
        }

        relationships[key] = {
          ...relationships[key] as Record<string, unknown>,
          ...envelopeRelationships[key] as Record<string, unknown>
        }
      }
    }

    if (Object.keys(attributes).length > 0) {
      resource.attributes = attributes
    }

    if (Object.keys(relationships).length > 0) {
      resource.relationships = relationships
    }

    return resource
  }

  return { data: extractResource(input, type), included }
}

/**
 * Serialize a plain object into a JSON:API request document.
 *
 * @param type - The resource type of the root object.
 * @param input - The plain object to serialize.
 * @param options - The type-name transforms.
 * @param document - The top-level members to send with the resource.
 * @returns The JSON:API document as a JSON string.
 */
export function serialize (
  type: string,
  input: Record<string, unknown>,
  options: SerializeOptions,
  document?: JsonApiDocument
): string {
  const { data, included } = serializeResource(type, input, options)

  // `data` and `included` are Fetchja's to build, so they always win
  // over `document`. `JSON.stringify` drops the `undefined`, which is
  // how an empty `included` stays out of the body.
  return JSON.stringify({
    ...document,
    data,
    included: included.length > 0 ? included : undefined
  })
}
