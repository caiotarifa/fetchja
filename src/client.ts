import { deserialize } from './deserialize.js'
import { serialize } from './serialize.js'
import { queryFormatter } from './query.js'
import { normalizePath, splitModel, type ModelOptions } from './model.js'
import { camelCase, kebabCase, snakeCase } from './case.js'
import { pluralize as defaultPluralize } from './pluralize.js'
import { FetchjaError } from './errors.js'
import type { FetchjaOptions, RequestOptions } from './types.js'

/** The media type required by the JSON:API specification. */
const JSON_API_MEDIA_TYPE = 'application/vnd.api+json'

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
export default class Fetchja {
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

    const body = options.body !== undefined && options.type !== undefined
      ? serialize(options.type, options.body, {
          caseType: this.typeCase,
          pluralTypes: this.pluralize
        }, options.document)
      : undefined

    const requestFetch = this.#fetch ?? fetch
    const baseHeaders = this.headers

    /**
     * Send the request. Defined as a closure so it can be replayed by
     * the `onResponseError` interceptor with the current headers.
     *
     * @returns The raw response.
     */
    function sendRequest (): Promise<Response> {
      const headers = new Headers({
        ...baseHeaders,
        ...options.headers
      })

      const init: RequestInit = {
        method: options.method,
        headers,
        body
      }

      return requestFetch(url, init)
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

    const payload = contentType.includes(JSON_API_MEDIA_TYPE)
      ? await response.json()
      : {}

    if (!response.ok) {
      throw new FetchjaError(response.statusText || 'Request failed', {
        status: response.status,
        statusText: response.statusText,
        errors: payload.errors,
        document: payload,
        response
      })
    }

    return {
      ...deserialize(payload),
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
