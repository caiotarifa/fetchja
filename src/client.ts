import { deserialize } from './deserialize.js'
import { serialize } from './serialize.js'
import { queryFormatter } from './query.js'
import { normalizePath, splitModel, type ModelOptions } from './model.js'
import { camelCase, kebabCase, snakeCase } from './case.js'
import { pluralize as defaultPluralize } from './pluralize.js'
import { FetchjaError } from './errors.js'
import {
  JSON_API_MEDIA_TYPE,
  resolveExtensions,
  type Extension,
  type RequestContext
} from './extensions.js'
import type { FetchjaOptions, RequestOptions } from './types.js'

/**
 * Return the given string unchanged. Used as the default transform when
 * no resource casing or pluralization is requested.
 *
 * @param value - The string to return.
 * @returns The same string.
 */
function identity (value: string): string {
  return value
}

/**
 * The resource-casing strategies selectable through `resourceCase`.
 * Stored on a null-prototype object so an unexpected option value cannot
 * reach inherited properties.
 */
const RESOURCE_CASES: Record<string, (value: string) => string> =
  Object.assign(Object.create(null), {
    camel: camelCase,
    kebab: kebabCase,
    snake: snakeCase,
    none: identity
  })

/**
 * The default query serializer, used when no `queryFormatter` option is
 * provided.
 *
 * @param params - The query parameters to serialize.
 * @returns The serialized query parameters.
 */
function defaultQueryFormatter (
  params: unknown
): string | URLSearchParams {
  return queryFormatter(params as Record<string, unknown>)
}

/**
 * Resolve the `pluralize` option into a transform function.
 *
 * @param option - The `pluralize` option value.
 * @returns The pluralization transform.
 */
function resolvePluralizer (
  option: FetchjaOptions['pluralize']
): (value: string) => string {
  if (option === false) {
    return identity
  }

  if (typeof option === 'function') {
    return option
  }

  return defaultPluralize
}

/**
 * Copy every response header into a plain object.
 *
 * @param response - The response to read headers from.
 * @returns A plain object of header names to values.
 */
function collectHeaders (response: Response): Record<string, string> {
  const headers: Record<string, string> = {}

  for (const [key, value] of response.headers.entries()) {
    headers[key] = value
  }

  return headers
}

/**
 * A super simple, lightweight JSON:API client built on the Fetch API.
 */
export class Fetchja {
  /** The base URL prepended to every request. */
  baseURL?: string

  /** Headers merged into every request. */
  headers: Record<string, string>

  /** Serializes the request query parameters. */
  queryFormatter: (params: unknown) => string | URLSearchParams

  /** Cases `type` names when serializing request bodies. */
  typeCase: (value: string) => string

  /** Cases resource names in the URL path. */
  resourceCase: (value: string) => string

  /** Pluralizes resource names. */
  pluralize: (value: string) => string

  /** Interceptor invoked on a non-OK response, before throwing. */
  onResponseError: FetchjaOptions['onResponseError']

  /** The registered extensions, in the order they were given. */
  readonly extensions: Extension[]

  /** The custom fetch implementation, when provided. */
  readonly #fetch?: typeof fetch

  /** Alias of {@link Fetchja.get}. */
  fetch!: Fetchja['get']

  /** Alias of {@link Fetchja.post}. */
  create!: Fetchja['post']

  /** Alias of {@link Fetchja.patch}. */
  update!: Fetchja['patch']

  /** Alias of {@link Fetchja.delete}. */
  remove!: Fetchja['delete']

  /**
   * @param options - The client options.
   */
  constructor (options: FetchjaOptions = {}) {
    this.baseURL = options.baseURL

    this.headers = {
      'Accept': JSON_API_MEDIA_TYPE,
      'Content-Type': JSON_API_MEDIA_TYPE,
      ...options.headers
    }

    this.#fetch = options.fetch

    this.queryFormatter = typeof options.queryFormatter === 'function'
      ? options.queryFormatter
      : defaultQueryFormatter

    this.resourceCase =
      RESOURCE_CASES[options.resourceCase ?? 'none'] ?? identity

    this.typeCase =
      RESOURCE_CASES[options.typeCase ?? 'camel'] ?? camelCase

    this.pluralize = resolvePluralizer(options.pluralize)

    this.onResponseError = options.onResponseError

    this.fetch = this.get
    this.create = this.post
    this.update = this.patch
    this.remove = this.delete

    this.extensions = resolveExtensions(options.extensions ?? [])

    for (const extension of this.extensions) {
      const methods = extension.methods?.(this) ?? {}

      for (const name in methods) {
        // An extension that shadows `get` or `request` would break the
        // client from the inside, so a collision is a hard error rather
        // than a last-one-wins.
        if (name in this) {
          throw new FetchjaError(
            `The extension "${extension.name}" cannot override ` +
            `\`${name}\`.`
          )
        }

        Object.defineProperty(this, name, {
          value: methods[name],
          writable: true,
          configurable: true
        })
      }
    }
  }

  /** The transforms shared by the path-building helpers. */
  get #modelOptions (): ModelOptions {
    return {
      resourceCase: this.resourceCase,
      pluralize: this.pluralize
    }
  }

  /**
   * Perform a request and return the deserialized response. Throws a
   * {@link FetchjaError} on a non-OK response.
   *
   * @param options - The request options.
   * @returns The deserialized response.
   */
  async request (
    options: RequestOptions
  ): Promise<Record<string, unknown>> {
    const base = this.baseURL ?? options.baseURL

    if (base === undefined || base === '') {
      throw new FetchjaError(
        'A `baseURL` is required to make requests.'
      )
    }

    const requestPath = options.url ?? ''

    const relativePath = requestPath.startsWith('/')
      ? requestPath.slice(1)
      : requestPath

    const baseWithSlash = base.endsWith('/') ? base : `${base}/`
    const url = new URL(relativePath, baseWithSlash)

    if (options.params !== undefined) {
      url.search = String(this.queryFormatter(options.params))
    }

    const context: RequestContext = {
      options,
      url,
      headers: { ...this.headers, ...options.headers }
    }

    for (const extension of this.extensions) {
      await extension.onRequest?.(context, this)
    }

    let body: string | undefined

    if (typeof options.body === 'string') {
      // An extension that builds a document the flat shape cannot
      // describe passes it through already serialized.
      body = options.body
    } else if (
      options.body !== undefined &&
      options.type !== undefined
    ) {
      body = serialize(options.type, options.body, {
        caseType: this.typeCase,
        pluralTypes: this.pluralize
      }, options.document)
    }

    const requestFetch = this.#fetch ?? fetch

    /**
     * Send the request. Defined as a closure so it can be replayed by
     * the `onResponseError` interceptor with the current headers.
     *
     * @returns The raw response.
     */
    function sendRequest (): Promise<Response> {
      const init: RequestInit = {
        method: options.method,
        headers: new Headers(context.headers),
        body
      }

      return requestFetch(context.url, init)
    }

    const initialResponse = await sendRequest()

    const augmentedResponse = Object.assign(initialResponse, {
      replayRequest: sendRequest
    })

    const handledResponse =
      augmentedResponse.ok || this.onResponseError === undefined
        ? augmentedResponse
        : await this.onResponseError(augmentedResponse)

    const response = handledResponse instanceof Response
      ? handledResponse
      : augmentedResponse

    const responseHeaders = collectHeaders(response)
    const contentType = responseHeaders['content-type'] ?? ''

    let payload: Record<string, any> = contentType
      .includes(JSON_API_MEDIA_TYPE)
      ? await response.json()
      : {}

    for (const extension of this.extensions) {
      payload = await extension.onResponse?.(payload, response, this) ??
        payload
    }

    if (!response.ok) {
      const error = new FetchjaError(
        response.statusText || 'Request failed',
        {
          status: response.status,
          statusText: response.statusText,
          errors: payload.errors,
          document: payload,
          response
        }
      )

      for (const extension of this.extensions) {
        await extension.onError?.(error, this)
      }

      throw error
    }

    return {
      ...(options.raw === true ? payload : deserialize(payload)),
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    }
  }

  /**
   * Read one or more resources.
   *
   * @param model - The resource path, e.g. `articles` or `articles/1`.
   * @param options - Extra request options.
   * @returns The deserialized response.
   */
  get (
    model: string,
    options: RequestOptions = {}
  ): Promise<Record<string, unknown>> {
    return this.request({
      ...options,
      method: options.method ?? 'GET',
      url: normalizePath(model, this.#modelOptions)
    })
  }

  /**
   * Create a resource.
   *
   * @param model - The resource name, e.g. `article`.
   * @param body - The resource to create.
   * @param options - Extra request options.
   * @returns The deserialized response.
   */
  post (
    model: string,
    body: Record<string, unknown>,
    options: RequestOptions = {}
  ): Promise<Record<string, unknown>> {
    const [type, url] = splitModel(model, this.#modelOptions)

    return this.request({
      ...options,
      method: options.method ?? 'POST',
      url,
      body,
      type
    })
  }

  /**
   * Update a resource. When the body has an `id`, it is appended to the
   * URL.
   *
   * @param model - The resource name, e.g. `article`.
   * @param body - The fields to update.
   * @param options - Extra request options.
   * @returns The deserialized response.
   */
  patch (
    model: string,
    body: Record<string, unknown>,
    options: RequestOptions = {}
  ): Promise<Record<string, unknown>> {
    const [type, url] = splitModel(model, this.#modelOptions)

    const resourceUrl = body.id !== undefined
      ? `${url}/${String(body.id)}`
      : url

    return this.request({
      ...options,
      method: options.method ?? 'PATCH',
      url: resourceUrl,
      body,
      type
    })
  }

  /**
   * Delete a resource. No request body is sent.
   *
   * @param model - The resource name, e.g. `article`.
   * @param id - The id of the resource to delete.
   * @param options - Extra request options.
   * @returns The deserialized response.
   */
  delete (
    model: string,
    id: string,
    options: RequestOptions = {}
  ): Promise<Record<string, unknown>> {
    const [, url] = splitModel(model, this.#modelOptions)

    return this.request({
      ...options,
      method: options.method ?? 'DELETE',
      url: `${url}/${id}`
    })
  }
}

export default Fetchja
