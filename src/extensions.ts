import { FetchjaError } from './errors.js'

import type Fetchja from './client.js'
import type { RequestOptions } from './types.js'

/** The media type required by the JSON:API specification. */
export const JSON_API_MEDIA_TYPE = 'application/vnd.api+json'

/**
 * The media type parameters JSON:API defines. Each is a space-separated
 * list of URIs, quoted as a single parameter value.
 *
 * @see https://jsonapi.org/format/1.1/#media-type-parameters
 */
export interface MediaTypeParameters {
  /** The extension URIs in use. */
  ext?: string[]

  /** The profile URIs in use. */
  profile?: string[]
}

/**
 * Build the JSON:API media type, with the `ext` and `profile`
 * parameters when they carry anything.
 *
 * @param parameters - The extensions and profiles to declare.
 * @returns The media type string.
 */
export function jsonApiMediaType (
  parameters: MediaTypeParameters = {}
): string {
  let mediaType = JSON_API_MEDIA_TYPE

  for (const name of ['ext', 'profile'] as const) {
    const uris = parameters[name]

    if (uris === undefined || uris.length === 0) {
      continue
    }

    // The spec joins several URIs with a space inside one quoted value,
    // and writes the parameter without a space after the semicolon.
    mediaType += `;${name}="${uris.join(' ')}"`
  }

  return mediaType
}

/**
 * The request as an extension sees it, just before it is sent. Both
 * `url` and `headers` are the live values: mutate them in place.
 */
export interface RequestContext {
  /** The options the request was made with. */
  options: RequestOptions

  /** The resolved absolute URL, query string included. */
  url: URL

  /** The headers that will be sent, already merged. */
  headers: Record<string, string>
}

/**
 * A JSON:API extension: a name, the spec identifiers it applies, the
 * methods it installs on the client, and the hooks it runs around a
 * request.
 *
 * @see https://jsonapi.org/format/1.1/#extensions
 */
export interface Extension {
  /** The unique name, used for de-duplication and error messages. */
  name: string

  /** The extension URI, e.g. `https://jsonapi.org/ext/atomic`. */
  uri?: string

  /** The reserved member namespace, e.g. `atomic`. */
  namespace?: string

  /** The URIs of the profiles the extension implements. */
  profiles?: string[]

  /**
   * The methods added to the client instance. An extension cannot
   * overwrite a member the client already has.
   */
  methods?: (
    client: Fetchja
  ) => Record<string, (...args: never[]) => unknown>

  /** Runs before the request is sent. Mutate the context in place. */
  onRequest?: (
    context: RequestContext,
    client: Fetchja
  ) => void | Promise<void>

  /**
   * Runs on the parsed payload of a response, before Fetchja reads it.
   * Return a document to continue with it instead.
   */
  onResponse?: (
    payload: Record<string, unknown>,
    response: Response,
    client: Fetchja
  ) => Record<string, unknown> | void |
    Promise<Record<string, unknown> | void>

  /**
   * Runs before a {@link FetchjaError} is thrown. Throw to replace it.
   */
  onError?: (
    error: FetchjaError,
    client: Fetchja
  ) => void | Promise<void>
}

/**
 * An extension, or a factory for one. A bare factory is called with no
 * arguments, so `[AtomicOperations]` and `[AtomicOperations({ ... })]`
 * both work.
 */
export type ExtensionInput = Extension | ((options?: never) => Extension)

/**
 * Resolve the `extensions` option into the extensions themselves,
 * calling any that were passed as a bare factory.
 *
 * @param input - The extensions, as given to the client.
 * @returns The resolved extensions, in the order they were given.
 */
export function resolveExtensions (
  input: ExtensionInput[]
): Extension[] {
  const extensions: Extension[] = []
  const names = new Set<string>()

  for (const entry of input) {
    const extension = typeof entry === 'function' ? entry() : entry

    if (names.has(extension.name)) {
      throw new FetchjaError(
        `The extension "${extension.name}" is registered twice.`
      )
    }

    names.add(extension.name)
    extensions.push(extension)
  }

  return extensions
}
