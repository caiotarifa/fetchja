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
 * Checks if a value is an object.
 *
 * @param {*} object The value to check.
 * @returns {boolean} Whether the value is an object.
 */
function hasObject (object) {
  return typeof object === 'object' && object !== null
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

    const getIncluded = item => item.type in included
      ? included[item.type][item.id]
      : item

    const replace = item => Array.isArray(item)
      ? item.map(getIncluded)
      : getIncluded(item)

    // Replace relationships with included data.
    for (const type in included) {
      for (const id in included[type]) {
        for (const key in included[type][id]) {
          const item = included[type][id][key]

          if (hasObject(item)) {
            included[type][id][key] = replace(item)
          }
        }
      }
    }

    // Replace relationships in the main data with included data.
    if (Array.isArray(output.data)) {
      for (const item of output.data) {
        for (const key in item) {
          if (hasObject(item[key])) {
            item[key] = replace(item[key])
          }
        }
      }
    } else if (hasObject(output.data)) {
      for (const key in output.data) {
        if (hasObject(output.data[key])) {
          output.data[key] = replace(output.data[key])
        }
      }
    }
  }

  return output
}