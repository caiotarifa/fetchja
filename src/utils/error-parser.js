/**
 * Parse the error response from the API.
 *
 * @param {Object} error The error object.
 * @throws {Error} The parsed error object.
 */
export function errorParser (error) {
  if (error.response) {
    const { data } = error.response

    if (data?.errors) {
      error.errors = data.errors
    }
  }

  throw error
}
