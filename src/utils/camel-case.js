/**
 * Convert a string from snake_case and kebab-case to camelCase.
 *
 * @param {string} input The string to convert.
 * @returns {string} The converted string.
 */
export function camelCase (input) {
  return input
    .toLowerCase()
    .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
    .replace(/^(.)/, (char) => char.toLowerCase())
}
