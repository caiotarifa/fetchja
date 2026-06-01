/**
 * The transforms used to turn a model name into a URL path segment.
 */
export interface ModelOptions {
  /** Cases a single path segment. */
  resourceCase: (segment: string) => string

  /** Pluralizes a single path segment. */
  pluralize: (segment: string) => string
}

/**
 * Check whether a path segment is a numeric resource id.
 *
 * @param segment - The path segment to check.
 * @returns `true` when the segment is all digits.
 */
function isResourceId (segment: string): boolean {
  return /^\d+$/.test(segment)
}

/**
 * Normalize a `get` model into a URL path. Only the resource being
 * addressed (the last non-numeric segment) is cased and pluralized, so
 * namespaces and numeric ids are left untouched. This keeps `get`
 * consistent with the path built by {@link splitModel}.
 *
 * @param model - The model path, e.g. `article`, `articles/1`.
 * @param options - The casing and pluralization transforms.
 * @returns The normalized URL path.
 */
export function normalizePath (
  model: string,
  options: ModelOptions
): string {
  const segments = model.split('/').filter(Boolean)

  const targetIndex = segments.reduce(
    (last, segment, index) => (isResourceId(segment) ? last : index),
    -1
  )

  return segments
    .map((segment, index) =>
      index === targetIndex
        ? options.pluralize(options.resourceCase(segment))
        : segment
    )
    .join('/')
}

/**
 * Split a write model into its resource `type` and URL path. The last
 * segment is treated as the resource and is cased and pluralized.
 *
 * @param url - The model path, e.g. `article`, `admin/article`.
 * @param options - The casing and pluralization transforms.
 * @returns A `[type, path]` tuple.
 */
export function splitModel (
  url: string,
  options: ModelOptions
): [string, string] {
  const parts = url.split('/').filter(Boolean)
  const model = parts.pop() ?? ''
  const namespace = parts.join('/')
  const path = options.pluralize(options.resourceCase(model))

  return [model, namespace ? `${namespace}/${path}` : path]
}
