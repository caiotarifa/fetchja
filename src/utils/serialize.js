import { errorParser } from './error-parser.js'

function serializeNode (node, key, data) {
  if (typeof node === 'object' && node !== null) {
    if (!data.relationships) {
      data.relationships = {}
    }

    const serializeEntity = (entity) => (entity.id ? { id: entity.id, type: entity.type || key } : entity)

    data.relationships[key] = {
      data: Array.isArray(node) ? node.map(serializeEntity) : serializeEntity(node),
      links: node.links,
      meta: node.meta
    }
  } else {
    if (!data.attributes) {
      data.attributes = {}
    }

    data.attributes[key] = node
  }

  return data
}

export function serialize (type, data, options = {
  camelCaseTypes: string => string,
  pluralTypes: string => string
}) {
  try {
    if (data === null || (Array.isArray(data) && !data.length)) {
      return { data }
    }

    const output = {
      type: options.pluralTypes(options.camelCaseTypes(type))
    }

    if (data.id) {
      output.id = String(data.id)
    }

    for (const key in data) {
      if (['id', 'type'].includes(key)) {
        continue
      }

      serializeNode(data[key], key, output)
    }

    return  JSON.stringify({ data: output })
  } catch (error) {
    errorParser(error)
  }
}
