export { default, Fetchja } from './client.js'
export { FetchjaError } from './errors.js'
export { camelCase, kebabCase, snakeCase } from './case.js'
export { pluralize } from './pluralize.js'
export {
  jsonApiMediaType,
  JSON_API_MEDIA_TYPE
} from './extensions.js'
export type {
  Extension,
  ExtensionInput,
  MediaTypeParameters,
  RequestContext
} from './extensions.js'
export type { FetchjaOptions, RequestOptions } from './types.js'
export type { JsonApiError, FetchjaErrorInit } from './errors.js'
export type { Resource } from './deattribute.js'
export type {
  JsonApiDocument,
  JsonApiLink,
  JsonApiLinks,
  JsonApiMeta,
  JsonApiObject,
  JsonApiRelationship,
  ResourceEnvelope,
  ResourceIdentifier
} from './jsonapi.js'
