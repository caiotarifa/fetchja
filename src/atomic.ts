import { deattribute } from './deattribute.js'
import { FetchjaError } from './errors.js'
import { jsonApiMediaType, type Extension } from './extensions.js'
import { serializeResource } from './serialize.js'

import type Fetchja from './client.js'
import type { Resource } from './deattribute.js'
import type {
  JsonApiLinks,
  JsonApiMeta,
  JsonApiObject
} from './jsonapi.js'
import type { RequestOptions } from './types.js'

/**
 * The URI identifying the Atomic Operations extension.
 *
 * @see https://jsonapi.org/ext/atomic/
 */
export const ATOMIC_EXT = 'https://jsonapi.org/ext/atomic'

/** The media type every atomic request is sent and accepted with. */
const ATOMIC_MEDIA_TYPE = jsonApiMediaType({ ext: [ATOMIC_EXT] })

/**
 * The options accepted by {@link AtomicOperations}.
 */
export interface AtomicOptions {
  /**
   * The operations endpoint, relative to the base URL. The extension
   * leaves the endpoint to the server, and `operations` is what the
   * specification's own examples use.
   */
  endpoint?: string
}

/**
 * The target of an operation. `type` with either `id` or `lid` points at
 * a resource; adding `relationship` points at one of its relationships.
 *
 * A `ref` is written exactly as it goes on the wire — its `type` is not
 * cased or pluralized, unlike a model name.
 *
 * @see https://jsonapi.org/ext/atomic/#operation-objects
 */
export interface OperationRef {
  /** The resource type. */
  type: string

  /** The resource id. */
  id?: string

  /** The local id of a resource created by an earlier operation. */
  lid?: string

  /** The relationship being operated on. */
  relationship?: string
}

/**
 * A single operation.
 *
 * @see https://jsonapi.org/ext/atomic/#operation-objects
 */
export interface Operation {
  /** The operation code. */
  op: 'add' | 'update' | 'remove'

  /** The target of the operation. Never set alongside `href`. */
  ref?: OperationRef

  /** The URI of the target. Never set alongside `ref`. */
  href?: string

  /** The operation's primary data. */
  data?: unknown

  /** Non-standard information about the operation. */
  meta?: JsonApiMeta
}

/**
 * The extra members an operation can carry.
 */
export interface OperationOptions {
  /** The URI of the target, in place of a `ref`. */
  href?: string

  /** Non-standard information about the operation. */
  meta?: JsonApiMeta
}

/**
 * The helpers handed to the {@link Fetchja.atomic} callback. The first
 * argument is either a model name, which is cased and pluralized the
 * way `post` and `patch` do it, or a {@link OperationRef}, which is
 * passed through as written.
 */
export interface OperationBuilder {
  /** Create a resource. The body may carry a `lid`. */
  add (
    model: string,
    body: Record<string, unknown>,
    options?: OperationOptions
  ): Operation

  /** Add members to a to-many relationship. */
  add (
    ref: OperationRef,
    data: unknown,
    options?: OperationOptions
  ): Operation

  /** Update a resource. The body must carry an `id` or a `lid`. */
  update (
    model: string,
    body: Record<string, unknown>,
    options?: OperationOptions
  ): Operation

  /** Set a to-one relationship, or replace a to-many one. */
  update (
    ref: OperationRef,
    data: unknown,
    options?: OperationOptions
  ): Operation

  /** Delete a resource. */
  remove (
    model: string,
    id: string,
    options?: OperationOptions
  ): Operation

  /** Delete a resource, or remove members from a relationship. */
  remove (
    ref: OperationRef,
    dataOrOptions?: unknown,
    options?: OperationOptions
  ): Operation

  /** Pass an operation through untouched. */
  raw (operation: Operation): Operation
}

/**
 * The result of a single operation, flattened. An operation the server
 * answered with no data — a deletion, usually — is `null`.
 */
export type AtomicResult = Record<string, unknown> |
  Record<string, unknown>[] | null

/**
 * The response to a batch of operations.
 */
export interface AtomicResponse {
  /** One result per operation, in the order they were sent. */
  results: AtomicResult[]

  /** The raw document, for the members `results` leaves behind. */
  document: Record<string, unknown>

  /** Non-standard information about the document. */
  meta?: JsonApiMeta

  /** The document links. */
  links?: JsonApiLinks

  /** The object describing the server's implementation. */
  jsonapi?: JsonApiObject

  /** The HTTP status code. */
  status: number

  /** The HTTP status message. */
  statusText: string

  /** The response headers. */
  headers: Record<string, string>
}

declare module './client.js' {
  interface Fetchja {
    /**
     * Send an ordered batch of operations to be performed atomically.
     *
     * @param build - Returns the operations to send.
     * @param options - Extra request options.
     * @returns One result per operation, in the order they were sent.
     */
    atomic (
      build: (op: OperationBuilder) => Operation[],
      options?: RequestOptions
    ): Promise<AtomicResponse>
  }
}

/**
 * Check whether an operation target is a {@link OperationRef}.
 *
 * @param target - The target to check.
 * @returns `true` when the target is a `ref`.
 */
function isRef (target: unknown): target is OperationRef {
  return (
    typeof target === 'object' &&
    target !== null &&
    !Array.isArray(target)
  )
}

/**
 * Build the operation helpers for a client.
 *
 * @param client - The client the operations are built for.
 * @returns The helpers handed to the `atomic` callback.
 */
function createBuilder (client: Fetchja): OperationBuilder {
  const serializeOptions = {
    caseType: client.typeCase,
    pluralTypes: client.pluralize
  }

  /**
   * Apply the client's type-name transforms to a model name.
   *
   * @param model - The model name, e.g. `article`.
   * @returns The resource type, e.g. `articles`.
   */
  function formatType (model: string): string {
    return client.pluralize(client.typeCase(model))
  }

  /**
   * Build a resource object for an operation. Sideposting has no place
   * here: an operation carries only its own `data`.
   *
   * @param model - The model name of the resource.
   * @param body - The resource to serialize.
   * @returns The JSON:API resource object.
   */
  function toResource (
    model: string,
    body: Record<string, unknown>
  ): Record<string, unknown> {
    const { data, included } = serializeResource(
      model,
      body,
      serializeOptions
    )

    if (included.length > 0) {
      throw new FetchjaError(
        'Atomic operations cannot sidepost. Give the related resource ' +
        'its own `add` operation and reference it by the same `lid`.'
      )
    }

    return data
  }

  /**
   * Assemble an operation, applying the `ref` or `href` that targets
   * it. The specification allows one or the other, never both.
   *
   * @param op - The operation code.
   * @param ref - The target, when the caller gave one.
   * @param options - The `href` and `meta` members.
   * @returns The operation, without its `data`.
   */
  function target (
    op: Operation['op'],
    ref: OperationRef | undefined,
    options: OperationOptions = {}
  ): Operation {
    if (ref !== undefined && options.href !== undefined) {
      throw new FetchjaError(
        'An operation is targeted by either `ref` or `href`, not both.'
      )
    }

    const operation: Operation = { op }

    if (ref !== undefined) {
      operation.ref = ref
    }

    if (options.href !== undefined) {
      operation.href = options.href
    }

    if (options.meta !== undefined) {
      operation.meta = options.meta
    }

    return operation
  }

  /**
   * Build an operation that carries data, from either form of target.
   *
   * @param op - The operation code.
   * @param model - The model name, or the `ref`.
   * @param data - The body to serialize, or the linkage to send.
   * @param options - The `href` and `meta` members.
   * @returns The operation.
   */
  function write (
    op: Operation['op'],
    model: string | OperationRef,
    data: unknown,
    options?: OperationOptions
  ): Operation {
    // A `ref` addresses something that already exists, so its `data` is
    // linkage the caller wrote in full. A model name addresses a
    // resource, so its body goes through the serializer.
    if (isRef(model)) {
      return { ...target(op, model, options), data }
    }

    return {
      ...target(op, undefined, options),
      data: toResource(model, data as Record<string, unknown>)
    }
  }

  return {
    add (
      model: string | OperationRef,
      data: unknown,
      options?: OperationOptions
    ): Operation {
      return write('add', model, data, options)
    },

    update (
      model: string | OperationRef,
      data: unknown,
      options?: OperationOptions
    ): Operation {
      return write('update', model, data, options)
    },

    remove (
      model: string | OperationRef,
      dataOrOptions?: unknown,
      options?: OperationOptions
    ): Operation {
      if (!isRef(model)) {
        return target(
          'remove',
          { type: formatType(model), id: String(dataOrOptions) },
          options
        )
      }

      // `remove(ref)` deletes a resource; `remove(ref, data)` removes
      // members from a to-many relationship, so its data is always a
      // list of identifiers. Anything else there is the options.
      const hasData = Array.isArray(dataOrOptions)

      const operation = target(
        'remove',
        model,
        hasData ? options : dataOrOptions as OperationOptions | undefined
      )

      return hasData ? { ...operation, data: dataOrOptions } : operation
    },

    raw (operation: Operation): Operation {
      return operation
    }
  } as OperationBuilder
}

/**
 * Flatten one entry of `atomic:results`. A result with no data — the
 * usual answer to a deletion — becomes `null`.
 *
 * @param result - The result object.
 * @returns The flattened resource, or `null`.
 */
function toResult (result: unknown): AtomicResult {
  if (typeof result !== 'object' || result === null) {
    return null
  }

  const { data } = result as Record<string, unknown>

  if (data === undefined || data === null) {
    return null
  }

  return deattribute(data as Resource | Resource[])
}

/**
 * The Atomic Operations extension. It adds `atomic` to the client: an
 * ordered batch of `add`, `update`, and `remove` operations, performed
 * as one — a failure anywhere undoes the whole batch.
 *
 * @example
 * ```js
 * import Fetchja from 'fetchja'
 * import { AtomicOperations } from 'fetchja/atomic'
 *
 * const api = new Fetchja({
 *   baseURL: 'https://api.example.com',
 *   extensions: [AtomicOperations]
 * })
 *
 * const { results } = await api.atomic(op => [
 *   op.add('author', { lid: 'a1', name: 'dgeb' }),
 *   op.add('article', {
 *     title: 'JSON API paints my bikeshed!',
 *     author: { type: 'authors', lid: 'a1' }
 *   })
 * ])
 * ```
 *
 * @param options - The extension options.
 * @returns The extension, ready to register.
 * @see https://jsonapi.org/ext/atomic/
 */
export function AtomicOperations (
  options: AtomicOptions = {}
): Extension {
  const endpoint = options.endpoint ?? 'operations'

  return {
    name: 'atomic-operations',
    uri: ATOMIC_EXT,
    namespace: 'atomic',

    methods: (client: Fetchja) => ({
      async atomic (
        build: (op: OperationBuilder) => Operation[],
        requestOptions: RequestOptions = {}
      ): Promise<AtomicResponse> {
        const operations = build(createBuilder(client))

        const response = await client.request({
          ...requestOptions,
          method: requestOptions.method ?? 'POST',
          url: requestOptions.url ?? endpoint,
          raw: true,
          body: JSON.stringify({
            ...requestOptions.document,
            'atomic:operations': operations
          }),
          headers: {
            'Accept': ATOMIC_MEDIA_TYPE,
            'Content-Type': ATOMIC_MEDIA_TYPE,
            ...requestOptions.headers
          }
        })

        const results = response['atomic:results']

        return {
          // A `204 No Content` is a valid answer when every operation
          // had nothing to return.
          results: Array.isArray(results) ? results.map(toResult) : [],
          document: response,
          meta: response.meta as JsonApiMeta | undefined,
          links: response.links as JsonApiLinks | undefined,
          jsonapi: response.jsonapi as JsonApiObject | undefined,
          status: response.status as number,
          statusText: response.statusText as string,
          headers: response.headers as Record<string, string>
        }
      }
    })
  }
}
