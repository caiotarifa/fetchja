import type { JsonApiDocument } from './jsonapi.js'

/**
 * The options accepted by the {@link Fetchja} constructor.
 */
export interface FetchjaOptions {
  /** The base URL prepended to every request. */
  baseURL?: string

  /** Headers merged into every request. */
  headers?: Record<string, string>

  /** A custom fetch implementation. Defaults to the global `fetch`. */
  fetch?: typeof fetch

  /** A custom serializer for the request query parameters. */
  queryFormatter?: (params: unknown) => string | URLSearchParams

  /** How resource names in the URL path are cased. */
  resourceCase?: 'camel' | 'kebab' | 'snake' | 'none'

  /** How `type` names are cased when serializing request bodies. */
  typeCase?: 'camel' | 'kebab' | 'snake' | 'none'

  /**
   * Pluralize resource names. `true` uses the built-in pluralizer,
   * `false` disables it, and a function injects a custom one.
   */
  pluralize?: boolean | ((word: string) => string)

  /**
   * Interceptor invoked on a non-OK response, before Fetchja throws.
   * The response is augmented with `replayRequest` so the original
   * request can be retried. Return a `Response` to continue with it.
   */
  onResponseError?: (
    response: Response & { replayRequest: () => Promise<Response> }
  ) => Response | void | Promise<Response | void>
}

/**
 * The options accepted by {@link Fetchja.request} and the request
 * methods. Most callers only set `params`, `headers`, or `method`.
 */
export interface RequestOptions {
  /** The request path, relative to the base URL. */
  url?: string

  /** A base URL for this request only. */
  baseURL?: string

  /** The HTTP method. */
  method?: string

  /** Headers for this request only. */
  headers?: Record<string, string>

  /** The query parameters to serialize. */
  params?: unknown

  /** The request body to serialize. */
  body?: Record<string, unknown>

  /** The resource type used to serialize the body. */
  type?: string

  /**
   * The top-level JSON:API members — `meta`, `links`, `jsonapi` — sent
   * alongside the request body.
   */
  document?: JsonApiDocument
}
