# Changelog

## 3.1.0 — 2026-08-14

Fetchja can be extended now, and the first official extension speaks [Atomic Operations](https://jsonapi.org/ext/atomic/).

### Changes

- **Extensions.** The `extensions` option takes a list of extensions. An extension adds methods to the client and hooks into `onRequest`, `onResponse`, and `onError`. Names must be unique, and an extension that tries to overwrite a built-in method throws. `onResponseError` keeps its place and its behavior.
- **`fetchja/atomic`.** `AtomicOperations` adds `api.atomic(op => [...])`: an ordered, all-or-nothing batch posted to `operations` (configurable), with `add`, `update`, `remove`, and `raw` builders, relationship targeting through a `ref`, `lid` links between operations, and positional `results`. Only that request carries the extension media type.
- **`jsonApiMediaType`** builds `application/vnd.api+json` with its `ext` and `profile` parameters. The `Extension`, `ExtensionInput`, `MediaTypeParameters`, and `RequestContext` types are exported for third-party extensions.
- **`Fetchja` is also a named export**, alongside the default one.
- **`raw` request option** returns the response document as it came, without flattening it.
- **Nested objects are only relationships when they say so.** An object — or a list of objects — is a relationship when it carries a `type`, `id`, or `lid`. Anything else is a plain JSON attribute and goes under `attributes` as it was given, so a JSON column (`metadata`, `settings`) finally survives. An object that carries a `type` and forgets its `id` still throws.
- **A resource with a `lid` and no `id` is sideposted** the way JSON:API 1.1 describes: the linkage holds `{ type, lid }` and the full resource goes to the top-level `included`. Deduplication tracks `id` and `lid` apart.

### Fixes

- **`$.attributes` is merged per key** over the derived attributes, instead of replacing the whole object whenever a flat field was present, which silently dropped it.

## 3.0.0 — 2026-08-06

Every member [JSON:API 1.1](https://jsonapi.org/format/1.1/) defines now survives a round trip.

### Changes

- **Resource members are preserved under `$`.** `meta`, `links`, `lid`, relationship `meta` and `links`, identifier `meta`, and any extension member are kept on a reserved `$` key instead of being dropped. The spec forbids `$` in member names, so it never clashes with an attribute — a field named `meta` stays flat, and the resource's own `meta` sits in `$.meta`. Resources with nothing extra have no `$`.
- **`$` is written back out.** Anything under `$` is emitted on the outgoing resource object, so a resource read from the server can be sent back without losing its `meta`, `links`, or `lid`. `type` and `id` are the exception: the resource owns them, and `$` never overrides them.
- **Top-level `links` and `jsonapi`** are returned next to `data` and `meta`, so pagination links are available.
- **`document` request option** sends the top-level `meta`, `links`, and `jsonapi` of a request.
- **`FetchjaError.document`** carries the whole error document, including its `meta` and `links`.
- **JSON:API types are exported**: `ResourceEnvelope`, `ResourceIdentifier`, `JsonApiRelationship`, `JsonApiLinks`, `JsonApiLink`, `JsonApiMeta`, `JsonApiObject`, `JsonApiDocument`, and `Resource`.

### Fixes

- **Bare identifiers stay out of `included`.** Linking an existing resource (`author: { type: 'people', id: '9' }`) used to sidepost `{ "type": "people", "id": "9" }` — a resource object with no attributes, which says nothing the relationship had not said already and which a server that validates `included` against its schema rejects. Only a related object that carries more than its identifier is collected now.
- **A list of plain values is an attribute again.** `tags: ['a', 'b']` used to be serialized as a to-many relationship with `"id": "undefined"` identifiers. Only a list of objects becomes a relationship now.
- **A resource with a `lid` and no `id`** no longer serializes `"id": "undefined"`.

### Breaking changes

- `$` is reserved on resources, in both directions.
- Request bodies omit `included` when there is nothing to include, instead of sending an empty array.
- Related objects that are nothing but a `type` and an `id` are no longer added to `included`.
- A list of plain values is serialized as an attribute, not as a to-many relationship.

## 2.2.0 — 2026-08-04

### Fixes

- **To-one relationships can be cleared.** A relationship object with an explicit `id: null` (`author: { id: null }`) now serializes to `relationships.author.data = null`, the shape JSON:API defines for removing a to-one relationship — matching what `tags: []` already did for to-many ([#6](https://github.com/caiotarifa/fetchja/issues/6)). An object with no `id` key still throws `All included resources must have an ID.`, so a forgotten key stays a loud error. A bare `author: null` remains an attribute.

## 2.1.0 — 2026-06-02

Query serialization is now fully [JSON:API 1.1](https://jsonapi.org/format/1.1/#query-parameters) compliant by default.

### Changes

- **Arrays serialize as comma-separated values** instead of bracketed keys. `include`, `sort`, and `fields[type]` now match the spec (`include=author,comments`), and list filters join the same way (`filter[id]=1,2,3`).
- **Both forms accepted.** Pass arrays (`include: ['author', 'comments']`) or comma-separated strings (`include: 'author,comments'`) — they produce identical output.
- **Deep filters supported.** Nested operator objects expand with brackets (`filter[price][gte]=10`), scalar arrays inside them join with commas (`filter[tags][any]=news,tech`), and arrays of objects fall back to indexed keys (`filter[or][][status]=active`).
- Empty arrays are omitted from the query string.

### Breaking changes

- Array params no longer emit `key[]=...` repeated keys. Servers that relied on the old bracket form can restore it with a custom `queryFormatter` (see the README).

## 2.0.0 — 2026-06-01

A full rewrite in TypeScript. Same simple API, now typed, smaller, and with no runtime dependencies.

### Highlights

- **Zero dependencies.** Dropped `pluralize`; a small, idempotent pluralizer is built in (and `status` → `statuses` works). Pass your own function or set `pluralize: false`.
- **Fully typed.** Written in TypeScript and ships its own types — no `@types` package needed.
- **Typed errors.** Failed requests throw a `FetchjaError` with `status`, `statusText`, `errors`, and `response`.
- **`typeCase` option.** Choose `'camel' | 'kebab' | 'snake' | 'none'` for `type` names, mirroring `resourceCase`.
- **Retry interceptor.** `onResponseError` receives a `replayRequest()` to retry a request (handy for refreshing a token).

### Breaking changes

- `fetchFunction` option renamed to `fetch`.
- `camelCaseTypes: boolean` replaced by `typeCase` (default `'camel'`).
- Failed requests now throw `FetchjaError` instead of returning errors.
- `get` now cases and pluralizes paths like the other methods.
- `delete` no longer sends a request body.
- `pluralize` is no longer a dependency.
- ESM-only build.

### Fixes

- `included` resolution: relationship pointers and included resources now share the same `type`; to-many, collections, and nested graphs resolve correctly.
- Null relationships are kept instead of dropped.
- Relationship ids are coerced to strings.
- Guards against prototype pollution when reading responses.
