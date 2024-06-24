import pluralize from 'pluralize'

import { deserialize } from './utils/deserialize.js'
import { serialize } from './utils/serialize.js'

import { errorParser } from './utils/error-parser.js'
import { queryFormatter } from './utils/query-formatter.js'
import { splitModel } from './utils/split-model.js'

import { camelCase } from './utils/camel-case.js'
import { kebabCase } from './utils/kebab-case.js'
import { snakeCase } from './utils/snake-case.js'

const jsonType = 'application/vnd.api+json'

/**
 * Options for Fetchja.
 * 
 * @typedef {Object} FetchjaOptions
 * @property {string} baseURL The base URL for all requests.
 * @property {Object} headers The headers to include in all requests.
 * @property {Function} queryFormatter A function to format query parameters.
 * @property {string} resourceCase The case to use for resource names.
 * @property {boolean} pluralize Pluralize resource names.
 */

/**
 * Fetchja is a simple wrapper around the Fetch API.
 * 
 * @class Fetchja
 * @param {FetchjaOptions} [options] Options for Fetchja.
 */
export default class Fetchja {
  constructor (options = {
    headers: {}
  }) {
    this.baseURL = options.baseURL

    // Headers
    this.headers = {
      Accept: jsonType,
      'Content-Type': jsonType,
      ...options.headers
    }

    // Query
    this.queryFormatter = typeof options.queryFormatter === 'function'
      ? options.queryFormatter
      : object => queryFormatter(object)

    // Camel Case Types
    this.camelCaseTypes = options.camelCaseTypes === false
      ? string => string
      : camelCase

    // Resource Case
    const cases = {
      camel: camelCase,
      kebab: kebabCase,
      snake: snakeCase,

      default: string => string
    }

    this.resourceCase = cases[options.resourceCase] || cases.default
    
    // Pluralise
    this.pluralize = options.pluralize === false
      ? string => string
      : pluralize
    
    // Interceptors
    this.onResponseError = error => error

    // Alias
    this.fetch = this.get
    this.update = this.patch
    this.create = this.post
    this.remove = this.delete
  }

  #splitModel (model) {
    return splitModel(model, {
      resourceCase: this.resourceCase,
      pluralize: this.pluralize
    })
  }

  async request (options = {
    method: 'GET',
    headers: {}
  }) {
    const url = new URL(options.url, this.baseURL || options.baseURL)

    // Params
    if (options.params) {
      url.search = this.queryFormatter(options.params)
    }

    // Body
    if (options.body) {
      options.body = serialize(options.type, options.body, {
        camelCaseTypes: this.camelCaseTypes,
        pluralTypes: this.pluralize
      })
    }

    // Request
    const makeRequest = () => {
      // Headers
      const headers = new Headers({
        ...this.headers,
        ...options.headers
      })

      // Fetch
      return fetch(url, {
        method: options.method,
        body: options.body,
        headers
      })
    }

    try {
      let response = await makeRequest()

      if (!response.ok) {
        response.replayRequest = makeRequest
        const replayedResponse = await this.onResponseError(response)

        if (replayedResponse instanceof Response) {
          response = replayedResponse
        }
      } else if (!response.ok) {
        throw new Error(response.statusText)
      }

      // Response Headers
      const responseHeaders = {}

      for (const [key, value] of response.headers.entries()) {
        responseHeaders[key] = value
      }

      const contentType = responseHeaders['content-type']

      // Response Data
      const data = contentType && contentType.includes(jsonType)
        ? await response.json()
        : {}

      // Return
      return {
        ...deserialize(data),

        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      }
    } catch (error) {
      throw error
    }
  }

  get (model, options = { method: 'GET' }) {
    try {
      options.url = model.split('/')
        .map(part => this.resourceCase(part))
        .filter(Boolean)
        .join('/')

      return this.request(options)
    } catch (error) {
      throw errorParser(error)
    }
  }

  patch (model, body, options = { method: 'PATCH' }) {
    try {
      const [type, url] = this.#splitModel(model)

      return this.request({
        url: body?.id ? `${url}/${body.id}` : url,
        body,
        type,

        ...options
      })
    } catch (error) {
      throw errorParser(error)
    }
  }

  post (model, body, options = { method: 'POST' }) {
    try {
      const [type, url] = this.#splitModel(model)

      return this.request({
        url,
        body,
        type,

        ...options
      })
    } catch (error) {
      throw errorParser(error)
    }
  }

  delete (model, id, options = { method: 'DELETE' }) {
    try {
      const [type, url] = this.#splitModel(model)

      return this.request({
        url: `${url}/${id}`,
        body: { id },
        type,

        ...options
      })
    } catch (error) {
      throw errorParser(error)
    }
  }
}
