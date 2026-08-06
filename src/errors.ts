import type { JsonApiLinks, JsonApiMeta } from './jsonapi.js'

/**
 * A single error object as defined by the JSON:API specification.
 *
 * @see https://jsonapi.org/format/#error-objects
 */
export interface JsonApiError {
  /** A unique identifier for this occurrence of the problem. */
  id?: string

  /** The HTTP status code, as a string. */
  status?: string

  /** An application-specific error code. */
  code?: string

  /** A short, human-readable summary of the problem. */
  title?: string

  /** A human-readable explanation of this occurrence of the problem. */
  detail?: string

  /** References to the source of the error. */
  source?: {
    /** A JSON Pointer to the value in the request document. */
    pointer?: string

    /** The query parameter that caused the error. */
    parameter?: string

    /** The request header that caused the error. */
    header?: string

    [key: string]: unknown
  }

  /** The error links, such as `about` and `type`. */
  links?: JsonApiLinks

  /** Non-standard information about the error. */
  meta?: JsonApiMeta

  [key: string]: unknown
}

/**
 * The extra fields used to build a {@link FetchjaError}.
 */
export interface FetchjaErrorInit {
  /** The HTTP status code of the failed response. */
  status?: number

  /** The HTTP status text of the failed response. */
  statusText?: string

  /** The JSON:API error objects returned by the server. */
  errors?: JsonApiError[]

  /** The whole error document, with its `meta`, `links`, and `jsonapi`. */
  document?: Record<string, unknown>

  /** The raw failed response. */
  response?: Response
}

/**
 * The error thrown when a request fails. It carries the HTTP status and
 * any JSON:API error objects returned by the server.
 */
export class FetchjaError extends Error {
  /** The HTTP status code of the failed response. */
  status?: number

  /** The HTTP status text of the failed response. */
  statusText?: string

  /** The JSON:API error objects returned by the server. */
  errors?: JsonApiError[]

  /** The whole error document, with its `meta`, `links`, and `jsonapi`. */
  document?: Record<string, unknown>

  /** The raw failed response. */
  response?: Response

  /**
   * @param message - The error message.
   * @param init - The extra fields to attach to the error.
   */
  constructor (message: string, init: FetchjaErrorInit = {}) {
    super(message)

    this.name = 'FetchjaError'
    this.status = init.status
    this.statusText = init.statusText
    this.errors = init.errors
    this.document = init.document
    this.response = init.response
  }
}
