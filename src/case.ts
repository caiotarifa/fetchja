/**
 * Convert a string to `camelCase` from `snake_case`, `kebab-case`, or
 * `SCREAMING_SNAKE_CASE`.
 *
 * @param input - The string to convert.
 * @returns The converted string.
 */
export function camelCase (input: string): string {
  return input
    .toLowerCase()
    .replace(/[-_](.)/g, (_match, character: string) =>
      character.toUpperCase()
    )
    .replace(/^(.)/, character => character.toLowerCase())
}

/**
 * Convert a string to `kebab-case` from `camelCase` or `snake_case`.
 *
 * @param input - The string to convert.
 * @returns The converted string.
 */
export function kebabCase (input: string): string {
  return input
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase()
}

/**
 * Convert a string to `snake_case` from `camelCase` or `kebab-case`.
 *
 * @param input - The string to convert.
 * @returns The converted string.
 */
export function snakeCase (input: string): string {
  return input
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase()
}
