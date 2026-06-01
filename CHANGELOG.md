# Changelog

## 2.0.0 — 2026-06-01

A full rewrite in TypeScript. Same simple API, now typed, smaller, and
with no runtime dependencies.

### Highlights

- **Zero dependencies.** Dropped `pluralize`; a small, idempotent
  pluralizer is built in (and `status` → `statuses` works). Pass your
  own function or set `pluralize: false`.
- **Fully typed.** Written in TypeScript and ships its own types — no
  `@types` package needed.
- **Typed errors.** Failed requests throw a `FetchjaError` with
  `status`, `statusText`, `errors`, and `response`.
- **`typeCase` option.** Choose `'camel' | 'kebab' | 'snake' | 'none'`
  for `type` names, mirroring `resourceCase`.
- **Retry interceptor.** `onResponseError` receives a `replayRequest()`
  to retry a request (handy for refreshing a token).

### Breaking changes

- `fetchFunction` option renamed to `fetch`.
- `camelCaseTypes: boolean` replaced by `typeCase` (default `'camel'`).
- Failed requests now throw `FetchjaError` instead of returning errors.
- `get` now cases and pluralizes paths like the other methods.
- `delete` no longer sends a request body.
- `pluralize` is no longer a dependency.
- ESM-only build.

### Fixes

- `included` resolution: relationship pointers and included resources
  now share the same `type`; to-many, collections, and nested graphs
  resolve correctly.
- Null relationships are kept instead of dropped.
- Relationship ids are coerced to strings.
- Guards against prototype pollution when reading responses.
