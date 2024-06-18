import { deattribute } from './deattribute.js'

/**
 * Group included JSON:API data by type and ID.
 *
 * @param {Object[]} included The included JSON:API data.
 * @returns {Object} The grouped included data.
 */
function groupIncluded (included) {
  const groups = {}

  for (const item of included) {
    if (!groups[item.type]) {
      groups[item.type] = {}
    }

    groups[item.type][item.id] = deattribute(item)
  }

  return groups
}

/**
 * Deserialises a JSON-API response.
 *
 * @param {Object} response The JSON-API response.
 * @returns {Object} The deserialised response.
 */
export function deserialize (response) {
  const output = {}

  if (response.data) {
    output.data = deattribute(response.data)
  }

  if (response.meta) {
    output.meta = response.meta
  }

  if (response.included) {
    const included = groupIncluded(response.included)
    const getIncluded = item => included[item.type][item.id]

    for (const item of output.data) {
      for (const key in item) {
        const itemKey = item[key]

        if (typeof itemKey === 'object') {
          item[key] = Array.isArray(itemKey)
            ? itemKey.map(getIncluded)
            : getIncluded(itemKey)
        }
      }
    }
  }

  return output
}