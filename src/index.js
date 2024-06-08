export default class Fetchja {
  constructor (options = {
    headers: {}
  }) {
    this.baseURL = options.baseURL

    // Headers
    this.headers = options.headers

    // Alias
    this.fetch = this.get
    this.update = this.patch
    this.create = this.post
    this.remove = this.delete
  }

  async request (method, endpoint, options = {
    headers: {},
    params: {}
  }) {
    const url = new URL(endpoint, this.baseURL || options.baseURL)

    // Params
    for (const key in options.params) {
      url.searchParams.append(key, options.params[key])
    }

    // Headers
    const headers = new Headers({
      ...this.headers,
      ...options.headers
    })

    try {
      const response = await fetch(url, {
        method,
        headers
      })

      if (!response.ok) {
        throw new Error(response.statusText)
      }

      const data = await response.json()

      return {
        data,

        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      }
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  get (endpoint, params, options = {}) {
    return this.request('get', endpoint, { params, ...options })
  }

  patch (endpoint, body, options = {}) {
    return this.request('patch', endpoint, { body, ...options })
  }

  post (endpoint, body, options = {}) {
    return this.request('post', endpoint, { body, ...options })
  }

  delete (endpoint, options = {}) {
    return this.request('delete', endpoint, options)
  }
}
