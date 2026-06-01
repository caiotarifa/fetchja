/**
 * A single error object as defined by the JSON:API specification.
 *
 * @see https://jsonapi.org/format/#error-objects
 */
export interface JsonApiError {
  /** The HTTP status code, as a string. */
  status?: string

  /** An application-specific error code. */
  code?: string

  /** A short, human-readable summary of the problem. */
  title?: string

  /** A human-readable explanation of this occurrence of the problem. */
  detail?: string

  /** References to the source of the error. */
  source?: Record<string, unknown>

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
    this.response = init.response
  }
}
