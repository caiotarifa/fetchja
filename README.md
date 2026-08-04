# Fetchja

**A tiny, modern, zero-dependency JSON:API client built on the native Fetch API.**

Fetchja helps you talk to a [JSON:API](https://jsonapi.org) server. It uses the browser's own `fetch`, so it stays small and fast. You write plain objects, and Fetchja turns them into JSON:API requests. The server answers, and Fetchja turns the answer back into plain objects — with relationships already filled in. It was inspired by [Kitsu](https://github.com/wopian/kitsu), but it has **no dependencies**.

```js
import Fetchja from 'fetchja'

const api = new Fetchja({
  baseURL: 'https://api.example.com'
})

const { data } = await api.get('articles')
```

## Contents

- [Why Fetchja?](#why-fetchja)
- [Install](#install)
- [Quick start](#quick-start)
- [Options](#options)
- [Methods](#methods)
- [Relationships and included data](#relationships-and-included-data)
- [Query parameters](#query-parameters)
- [Make your own query formatter](#make-your-own-query-formatter)
- [Custom fetch](#custom-fetch)
- [Errors](#errors)
- [Retry on error](#retry-on-error)
- [Use with TanStack Query](#use-with-tanstack-query)
- [TypeScript](#typescript)
- [Plurals](#plurals)

## Why Fetchja?

- ⚡️ **No dependencies.** It only uses the built-in `fetch`. Nothing extra to download. About 5 KB when minified.
- 🧩 **Typed.** It is written in TypeScript and ships its own types. You get autocomplete out of the box.
- 🔄 **Less boilerplate.** You send and read plain objects. Fetchja does the JSON:API parts for you.
- 🪶 **Modern and small.** ESM only, `async`/`await`, no base class to extend.
- 🛡️ **Safe.** It guards against prototype pollution when it reads a response.
- 🎛️ **Flexible.** Set your own headers, query format, name case, plurals, `fetch`, and error handling.

## Install

```bash
npm install fetchja
```

You don't need any other package. Fetchja needs a place where `fetch` exists: Node 18+, Deno, Bun, or any modern browser.

## Quick start

```js
import Fetchja from 'fetchja'

const api = new Fetchja({
  baseURL: 'https://api.example.com'
})

// GET /articles
const { data, meta } = await api.get('articles')

// GET /articles/1
const { data: article } = await api.get('articles/1')

console.log(article)
// { type: 'articles', id: '1', title: 'Hello world', ... }
```

## Options

You set everything when you create the client:

```js
const api = new Fetchja({ /* options */ })
```

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `baseURL` | `string` | — | The start of every URL. You need it (or pass one per request). |
| `headers` | `Record<string, string>` | JSON:API headers | Headers added to every request. The JSON:API `Accept` and `Content-Type` are set for you. |
| `fetch` | `typeof fetch` | global `fetch` | Your own fetch function (for example, one that adds a token). |
| `queryFormatter` | `(params) => string \| URLSearchParams` | built-in | Turns the `params` object into a query string. |
| `resourceCase` | `'camel' \| 'kebab' \| 'snake' \| 'none'` | `'none'` | How the resource name in the URL is written. |
| `typeCase` | `'camel' \| 'kebab' \| 'snake' \| 'none'` | `'camel'` | How `type` names are written when you send data. |
| `pluralize` | `boolean \| ((word) => string)` | `true` (built-in) | Make resource names plural. Use `false` to turn it off, or pass your own function. |
| `onResponseError` | `(response) => Response \| void` | — | Runs when a request fails, before Fetchja throws. You can retry here. |

## Methods

| Method | Alias | How to call it | HTTP |
| --- | --- | --- | --- |
| `get` | `fetch` | `get(model, options?)` | `GET` |
| `post` | `create` | `post(model, body, options?)` | `POST` |
| `patch` | `update` | `patch(model, body, options?)` | `PATCH` |
| `delete` | `remove` | `delete(model, id, options?)` | `DELETE` |

Pick the name you like. `api.get` and `api.fetch` do the same thing. So do `create`/`post`, `update`/`patch`, and `remove`/`delete`.

```js
// Read a list
const { data } = await api.get('articles')

// Read one
const { data } = await api.get('articles/1')

// Create
await api.create('article', { title: 'Hello world' })

// Update (put the id in the body)
await api.update('article', { id: '1', title: 'New title' })

// Delete
await api.remove('article', '1') // DELETE /articles/1 (no body)
```

Every call gives you back the data plus a few extra fields:

```js
const response = await api.get('articles/1')

response.data        // your data (an object, or an array for a list)
response.meta        // the JSON:API `meta`, if the server sent it
response.status      // 200
response.statusText  // 'OK'
response.headers     // the response headers, as a plain object
```

## Relationships and included data

To send a relationship, put an object (or a list of objects) with a `type` and an `id` inside your data. Fetchja moves it to the right place and adds the full resource to `included` for you:

```js
await api.create('article', {
  title: 'Hello world',
  author: { type: 'people', id: '9' },
  tags: [
    { type: 'tags', id: '1' },
    { type: 'tags', id: '2' }
  ]
})
```

To clear a relationship, send it empty: an empty list for a to-many, and an `id` of `null` for a to-one. Both become `data: null` / `data: []` in the request, the way JSON:API asks for it:

```js
await api.update('article', {
  id: '1',
  author: { id: null }, // relationships.author.data = null
  tags: [] // relationships.tags.data = []
})
```

A plain `author: null` is still an attribute, not a relationship — Fetchja cannot tell the two apart without the object. And an object with **no** `id` key at all still throws, so a forgotten `id` never clears a relationship by accident.

When you read data back, Fetchja takes the resources from `included` and puts them right inside your data. So you can read a relationship like a normal nested object:

```js
const { data } = await api.get('articles/1', {
  params: { include: 'author' }
})

console.log(data.author.name) // comes from `included`
```

## Query parameters

Pass a `params` object. Fetchja serializes it into [JSON:API 1.1](https://jsonapi.org/format/1.1/#query-parameters) query strings: nested objects become bracketed keys, and arrays become comma-separated values (the format the spec defines for `include`, `sort`, `fields[type]`, and list filters).

```js
const { data, meta } = await api.get('articles', {
  params: {
    include: ['author', 'comments'],
    fields: { articles: ['title', 'body'] },
    filter: { published: true },
    sort: ['-createdAt'],
    page: { number: 1, size: 10 }
  }
})
```

This becomes:

```
/articles?include=author,comments&fields[articles]=title,body&filter[published]=true&sort=-createdAt&page[number]=1&page[size]=10
```

Strings work too, so you can pass the comma-separated form directly if you prefer — `include: 'author,comments'` and `sort: '-createdAt'` produce the same output.

Filters of any depth are supported. Object values nest with brackets, scalar arrays join with commas, and arrays of objects (e.g. boolean groups) expand into indexed keys:

```js
await api.get('articles', {
  params: {
    filter: {
      id: [1, 2, 3],            // filter[id]=1,2,3
      price: { gte: 10, lte: 100 }, // filter[price][gte]=10&filter[price][lte]=100
      tags: { any: ['news', 'tech'] }, // filter[tags][any]=news,tech
      or: [{ status: 'active' }, { status: 'pending' }]
      // filter[or][][status]=active&filter[or][][status]=pending
    }
  }
})
```

## Make your own query formatter

The default formatter is JSON:API 1.1 compliant. Some servers want a different shape — for example, repeated `include[]=author&include[]=comments` keys instead of one comma-separated value. You can pass your own function:

```js
import Fetchja from 'fetchja'

function bracketQueryFormatter (params) {
  const search = new URLSearchParams()

  for (const key in params) {
    const value = params[key]

    if (Array.isArray(value)) {
      for (const item of value) search.append(`${key}[]`, String(item))
    } else {
      search.append(key, String(value))
    }
  }

  return search
}

const api = new Fetchja({
  baseURL: 'https://api.example.com',
  queryFormatter: bracketQueryFormatter
})

await api.get('articles', { params: { include: ['author', 'comments'] } })
// -> /articles?include[]=author&include[]=comments
```

Your function takes the `params` object and returns a string or a `URLSearchParams`.

## Custom fetch

You can swap in your own fetch function. This is handy for tokens, timeouts, or logging:

```js
const api = new Fetchja({
  baseURL: 'https://api.example.com',
  fetch: (url, init) => myCustomFetch(url, init)
})
```

## Errors

When a request fails, Fetchja throws a `FetchjaError`. It holds the HTTP status and the JSON:API `errors` list:

```js
import Fetchja, { FetchjaError } from 'fetchja'

try {
  await api.get('articles/999')
} catch (error) {
  if (error instanceof FetchjaError) {
    console.log(error.status)     // 404
    console.log(error.statusText) // 'Not Found'
    console.log(error.errors)     // [{ status: '404', detail: 'Not found' }]
    console.log(error.response)   // the raw Response
  }
}
```

## Retry on error

`onResponseError` runs when the server sends a failing response, before Fetchja throws. The response also gets a `replayRequest()` method. It sends the same request again. This is great for refreshing a token and trying once more:

```js
const api = new Fetchja({
  baseURL: 'https://api.example.com',
  headers: { Authorization: `Bearer ${getToken()}` },
  onResponseError: async (response) => {
    if (response.status === 401) {
      api.headers.Authorization = `Bearer ${await refreshToken()}`

      return response.replayRequest() // try again with the new token
    }
  }
})
```

Return a `Response` (like the one from `replayRequest()`) to keep going. Return nothing, and Fetchja throws the `FetchjaError`.

## Use with TanStack Query

Fetchja works well with [TanStack Query](https://tanstack.com/query). Because Fetchja throws on a failing request, TanStack Query sees the error and handles it for you.

Reading data:

```js
import { useQuery } from '@tanstack/react-query'
import Fetchja from 'fetchja'

const api = new Fetchja({ baseURL: 'https://api.example.com' })

function useArticles () {
  return useQuery({
    queryKey: ['articles'],
    queryFn: () => api.get('articles')
  })
}
```

Creating data:

```js
import { useMutation, useQueryClient } from '@tanstack/react-query'

function useCreateArticle () {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (article) => api.create('article', article),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
    }
  })
}
```

## TypeScript

Fetchja is written in TypeScript and brings its own types. You don't need an extra `@types` package.

```ts
import Fetchja, { type FetchjaOptions, FetchjaError } from 'fetchja'

const options: FetchjaOptions = {
  baseURL: 'https://api.example.com',
  resourceCase: 'kebab'
}

const api = new Fetchja(options)
```

## Plurals

By default, Fetchja makes resource names plural with a small built-in helper. It knows the common English rules (and `status` becomes `statuses`, not `statu`). It is also safe to run twice: `articles` stays `articles`.

For tricky words (like `person` → `people`), pass a bigger library such as [`pluralize`](https://www.npmjs.com/package/pluralize):

```js
import pluralize from 'pluralize'

const api = new Fetchja({
  baseURL: 'https://api.example.com',
  pluralize
})
```

Or turn it off and use the exact names you write:

```js
const api = new Fetchja({
  baseURL: 'https://api.example.com',
  pluralize: false
})
```
