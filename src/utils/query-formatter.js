/**
 * Loop through an object and build a query string.
 * 
 * @param {URLSearchParams} query The query to append to.
 * @param {Object} object The object to loop through.
 * @param {string} prefix The prefix to use.
 * @returns {void}
 * @private
 */
function buildQuery (query, object = {}, prefix = '') {
  const isArray = Array.isArray(object)

  for (const key in object) {
    const value = object[key]
    const withPrefix = prefix ? `${prefix}[${isArray ? '' : key}]` : key

    value instanceof Object
      ? buildQuery(query, value, withPrefix)
      : query.append(withPrefix, value)
  }
}

/**
 * Format query parameters.
 * 
 * @param {Object} parameters The parameters to format.
 * @returns {URLSearchParams} The formatted query.
 */
export function queryFormatter (parameters = {}) {
  const query = new URLSearchParams()
  buildQuery(query, parameters)

  return query
}
