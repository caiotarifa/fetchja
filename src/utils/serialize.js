import { errorParser } from './error-parser.js'

/**
 * Checks if a value is an object.
 *
 * @param {*} object The object to check.
 * @returns {boolean} Whether the value is an object.
 */
function hasObject (object) {
  return typeof object === 'object' && object !== null
}

/**
 * Serialises a JSON-API request.
 * 
 * @param {string} type The entity name.
 * @param {Object} request The request to serialise.
 * @param {Object} options The serialisation options.
 * @returns {string} The JSON serialised request.
 */
export function serialize (type, request, options = {
  camelCaseTypes: string => string,
  pluralTypes: string => string
}) {
  const included = []

  function include (node, subtype) {
    if (!hasObject(node)) {
      return
    }

    if (!node.id) {
      throw new Error('All included resources must have an ID.')
    }

    if (!included.find(item => item.id === node.id)) {
      included.push(extractData(node, subtype))
    }
  }

  function extractData (node, subtype) {
    const data = {
      type: options.pluralTypes(options.camelCaseTypes(subtype))
    }

    for (const key in node) {
      if (key === 'type') {
        continue
      }

      if (key === 'id') {
        data.id = String(node.id)
        continue
      }
      
      const value = node[key]

      // Is this a relationship?
      if (typeof value === 'object') {
        data.relationships = data.relationships || {}

        // One-To-Many / Many-To-Many
        if (Array.isArray(value)) {
          data.relationships[key] = {
            data: value.map(item => {
              include(item, key)
              return { type: item.type || key, id: item.id }
            })
          }

          continue
        }

        // One-To-One
        data.relationships[key] = {
          data: { type: value.type || key, id: value.id }
        }

        include(value, key)

        continue
      }

      // Is this an attribute?
      data.attributes = data.attributes || {}
      data.attributes[key] = node[key]
    }

    return data
  }

  try {
    const data = extractData(request, type)
    return JSON.stringify({ data, included })
  } catch (error) {
    errorParser(error)
  }
}
