/**
 * Convert a string from camelCase and snake_case to kebab-case.
 *
 * @param {string} input The string to convert.
 * @returns {string} The converted string.
 */
export function kebabCase (input) {
  return input
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase()
}
