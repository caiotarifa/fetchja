/**
 * Split a model name from a URL.
 *
 * @param {string} url The URL to split.
 * @param {Object} options The options to use.
 * @returns {string[]} The model and resource.
 */
export function splitModel (url, options = {
  resourceCase: string => string,
  pluralize: string => string
}) {
  const parts = url.split('/')
  const model = parts.pop()
  const resource = parts.join('/')

  return [
    model,
    `${resource}/${options.pluralize(options.resourceCase(model))}`
  ]
}
