/**
 * Converts a string from camelCase and kebab-case to snake_case.
 *
 * @param {string} input The string to convert.
 * @returns {string} The converted string.
 */
export function snakeCase (input) {
  return input
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase()
}
