/**
 * The types defined by the JSON:API specification. They describe the
 * members Fetchja cannot flatten — everything a resource carries beyond
 * its `attributes` and `relationships`.
 *
 * @see https://jsonapi.org/format/1.1/
 */

/**
 * A free-form object holding non-standard information.
 *
 * @see https://jsonapi.org/format/1.1/#document-meta
 */
export type JsonApiMeta = Record<string, unknown>

/**
 * A link object. Links may also be plain URL strings.
 *
 * @see https://jsonapi.org/format/1.1/#document-links
 */
export interface JsonApiLink {
  /** The link's target URL. */
  href: string

  /** The link relation type. */
  rel?: string

  /** A link to a description document. */
  describedby?: string | JsonApiLink

  /** A human-readable label for the link's destination. */
  title?: string

  /** The media type of the link's target. */
  type?: string

  /** The language(s) of the link's target. */
  hreflang?: string | string[]

  /** Non-standard information about the link. */
  meta?: JsonApiMeta
}

/**
 * A links object, keyed by link name (`self`, `related`, `next`, ...).
 */
export type JsonApiLinks = Record<string, string | JsonApiLink | null>

/**
 * A resource identifier object.
 *
 * @see https://jsonapi.org/format/1.1/#document-resource-identifier-objects
 */
export interface ResourceIdentifier {
  /** The resource type. */
  type: string

  /** The resource id. */
  id?: string

  /** The local id of a client-generated resource. */
  lid?: string

  /** Non-standard information about the identifier. */
  meta?: JsonApiMeta
}

/**
 * A relationship object. It must carry at least one of `data`, `links`,
 * or `meta`.
 *
 * @see https://jsonapi.org/format/1.1/#document-resource-object-relationships
 */
export interface JsonApiRelationship {
  /** The resource linkage. */
  data?: ResourceIdentifier | ResourceIdentifier[] | null

  /** The relationship links. */
  links?: JsonApiLinks

  /** Non-standard information about the relationship. */
  meta?: JsonApiMeta

  [key: string]: unknown
}

/**
 * The object describing the server's implementation.
 *
 * @see https://jsonapi.org/format/1.1/#document-jsonapi-object
 */
export interface JsonApiObject {
  /** The highest JSON:API version supported. */
  version?: string

  /** The applied extensions. */
  ext?: string[]

  /** The applied profiles. */
  profile?: string[]

  /** Non-standard information about the implementation. */
  meta?: JsonApiMeta
}

/**
 * The JSON:API members of a resource that the flat shape cannot hold,
 * exposed on the reserved `$` key. The specification forbids `$` in
 * member names, so `$` can never collide with an attribute.
 *
 * @see https://jsonapi.org/format/1.1/#document-member-names
 */
export interface ResourceEnvelope {
  /** The local id of a client-generated resource. */
  lid?: string

  /** The resource links. */
  links?: JsonApiLinks

  /** Non-standard information about the resource. */
  meta?: JsonApiMeta

  /**
   * The `links` and `meta` of each relationship, plus the raw resource
   * linkage whenever an identifier carries its own `meta`.
   */
  relationships?: Record<string, JsonApiRelationship>

  [key: string]: unknown
}

/**
 * The top-level members Fetchja sends alongside a request body.
 *
 * @see https://jsonapi.org/format/1.1/#document-top-level
 */
export interface JsonApiDocument {
  /** Non-standard information about the document. */
  meta?: JsonApiMeta

  /** The document links. */
  links?: JsonApiLinks

  /** The object describing the client's implementation. */
  jsonapi?: JsonApiObject

  [key: string]: unknown
}
