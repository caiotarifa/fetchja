/**
 * Deattribute JSON:API data.
 *
 * @param {Object|Object[]} data The JSON:API data to deattribute.
 * @returns {Object} The deattributed data.
 */
export function deattribute (data) {
  if (Array.isArray(data)) {
    return data.map(deattribute)
  }

  const output = {
    type: data.type,
    id: data.id
  }

  for (const key in data.attributes) {
    output[key] = data.attributes[key]
  }

  for (const key in data.relationships) {
    if (data.relationships[key].data) {
      output[key] = data.relationships[key].data
    }
  }

  return output
}