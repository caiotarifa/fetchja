export const NAV_LINKS = [
  { href: '#why', label: 'why' },
  { href: '#install', label: 'install' },
  { href: '#quickstart', label: 'quick start' },
  { href: '#options', label: 'options' },
  { href: '#methods', label: 'methods' },
  { href: '#metadata', label: 'meta & links' },
  { href: '#query', label: 'query' },
  { href: '#extensions', label: 'extensions' },
  { href: '#typescript', label: 'typescript' }
] as const

export const HERO = {
  eyebrow: 'zero-dependency',
  title: 'Ship JSON:API without serializer clutter.',
  highlight: 'serializer clutter.',
  installCommand: 'npm install fetchja',
  lede: [
    'Fetchja turns plain objects into JSON:API requests and turns responses',
    'back into plain objects with relationships already resolved. It is built',
    'on native fetch, so the client stays small and predictable.'
  ].join(' '),
  stats: [
    { value: '~6', accent: true, suffix: 'KB', label: 'minified' },
    { value: '0', accent: true, suffix: '', label: 'dependencies' },
    { value: '100%', accent: false, suffix: '', label: 'typed' }
  ],
  code: `import Fetchja from 'fetchja'

const api = new Fetchja({
  baseURL: 'https://api.example.com'
})

const { data, meta } = await api.get('articles')

const { data: article } = await api.get('articles/1', {
  params: { include: 'author' }
})

console.log(article.author.name)`
} as const

export const FEATURES = [
  {
    icon: 'bolt',
    title: 'No runtime dependencies',
    body: [
      'Fetchja uses the platform fetch API and stays around 6 KB minified.',
      'There is no adapter stack to keep patched.'
    ].join(' ')
  },
  {
    icon: 'code',
    title: 'Types included',
    body: [
      'The package is written in TypeScript and ships its own definitions,',
      'so autocomplete works without an extra @types package.'
    ].join(' ')
  },
  {
    icon: 'repeat',
    title: 'Less JSON:API boilerplate',
    body: [
      'Send and receive plain objects. Fetchja handles resources,',
      'relationships, included data, and query strings — and drops',
      'nothing the specification defines.'
    ].join(' ')
  },
  {
    icon: 'shield',
    title: 'Safer response parsing',
    body: [
      'Responses are deserialized with prototype-pollution guards before',
      'your app touches the payload.'
    ].join(' ')
  },
  {
    icon: 'sliders',
    title: 'Configurable edges',
    body: [
      'Bring your own headers, query formatter, casing strategy, pluralizer,',
      'fetch implementation, and retry hook.'
    ].join(' ')
  },
  {
    icon: 'graph',
    title: 'Relationships resolved',
    body: [
      'Nested relationship objects serialize correctly on write and are',
      'merged from included data on read.'
    ].join(' ')
  }
] as const

export const QUICK_START_CODE = `import Fetchja from 'fetchja'

const api = new Fetchja({
  baseURL: 'https://api.example.com'
})

const { data, meta } = await api.get('articles')
const { data: article } = await api.get('articles/1')

console.log(article)
// { type: 'articles', id: '1', title: 'Hello world', ... }`

export const OPTIONS_CODE = `const api = new Fetchja({
  baseURL: 'https://api.example.com',
  headers: {},
  fetch: globalThis.fetch,
  queryFormatter: undefined,
  resourceCase: 'none',
  typeCase: 'camel',
  pluralize: true,
  onResponseError: undefined
})`

export const OPTIONS = [
  {
    name: 'baseURL',
    type: 'string',
    defaultValue: 'required',
    description: 'The base URL used to build every request.'
  },
  {
    name: 'headers',
    type: 'Record<string, string>',
    defaultValue: 'JSON:API headers',
    description: 'Headers merged into every request.'
  },
  {
    name: 'fetch',
    type: 'typeof fetch',
    defaultValue: 'global fetch',
    description: 'A custom fetch function for tokens, logging, or timeouts.'
  },
  {
    name: 'queryFormatter',
    type: '(params) => string | URLSearchParams',
    defaultValue: 'built-in',
    description: 'Turns params into a JSON:API query string.'
  },
  {
    name: 'resourceCase',
    type: 'camel | kebab | snake | none',
    defaultValue: '\'none\'',
    description: 'Controls resource names in URL paths.'
  },
  {
    name: 'typeCase',
    type: 'camel | kebab | snake | none',
    defaultValue: '\'camel\'',
    description: 'Controls type names when request bodies are serialized.'
  },
  {
    name: 'pluralize',
    type: 'boolean | ((word) => string)',
    defaultValue: 'true',
    description: 'Pluralizes resource names, or accepts your own pluralizer.'
  },
  {
    name: 'onResponseError',
    type: '(response) => Response | void',
    defaultValue: 'optional',
    description: 'Runs before Fetchja throws and can replay failed requests.'
  }
] as const

export const METHODS = [
  {
    method: 'get',
    alias: 'fetch',
    signature: 'get(model, options?)',
    http: 'GET'
  },
  {
    method: 'post',
    alias: 'create',
    signature: 'post(model, body, options?)',
    http: 'POST'
  },
  {
    method: 'patch',
    alias: 'update',
    signature: 'patch(model, body, options?)',
    http: 'PATCH'
  },
  {
    method: 'delete',
    alias: 'remove',
    signature: 'delete(model, id, options?)',
    http: 'DELETE'
  }
] as const

export const CRUD_EXAMPLES = [
  {
    http: 'GET',
    tone: 'get',
    title: 'Read a list',
    call: 'api.get(\'articles\')',
    note: 'Array of resolved resource objects',
    response: [
      '{',
      '  "data": [',
      '    { "id": "1", "type": "articles", "title": "Hello world" },',
      '    { "id": "2", "type": "articles", "title": "Second post" }',
      '  ],',
      '  "meta": { "total": 42 },',
      '  "links": { "next": "/articles?page[offset]=2" },',
      '  "status": 200',
      '}'
    ].join('\n')
  },
  {
    http: 'GET',
    tone: 'get',
    title: 'Read one',
    call: 'api.get(\'articles/1\')',
    note: 'Single resource object with resolved relationships',
    response: [
      '{',
      '  "data": {',
      '    "id": "1",',
      '    "type": "articles",',
      '    "title": "Hello world",',
      '    "author": { "id": "9", "name": "Ada Lovelace" }',
      '  },',
      '  "status": 200',
      '}'
    ].join('\n')
  },
  {
    http: 'POST',
    tone: 'post',
    title: 'Create',
    call: 'api.create(\'article\', { title: \'Hello\' })',
    note: 'Server-assigned id comes back in data',
    response: [
      '{',
      '  "data": {',
      '    "id": "3",',
      '    "type": "articles",',
      '    "title": "Hello"',
      '  },',
      '  "status": 201',
      '}'
    ].join('\n')
  },
  {
    http: 'PATCH',
    tone: 'patch',
    title: 'Update',
    call: 'api.update(\'article\', { id: \'1\', title: \'New title\' })',
    note: 'Updated fields reflected immediately',
    response: [
      '{',
      '  "data": {',
      '    "id": "1",',
      '    "type": "articles",',
      '    "title": "New title"',
      '  },',
      '  "status": 200',
      '}'
    ].join('\n')
  },
  {
    http: 'DELETE',
    tone: 'delete',
    title: 'Delete',
    call: 'api.remove(\'article\', \'1\')',
    note: 'No body is returned for 204 responses',
    response: [
      '{',
      '  "data": null,',
      '  "status": 204',
      '}'
    ].join('\n')
  }
] as const

export const RELATIONSHIP_CREATE_CODE = `await api.create('article', {
  title: 'Hello world',
  author: { type: 'people', id: '9' },
  tags: [
    { type: 'tags', id: '1' },
    { type: 'tags', id: '2' }
  ]
})`

export const RELATIONSHIP_CLEAR_CODE = `await api.update('article', {
  id: '1',
  author: { id: null }, // data: null
  tags: [] // data: []
})`

export const RELATIONSHIP_READ_CODE = `const { data } = await api.get(
  'articles/1',
  { params: { include: 'author' } }
)

console.log(data.author.name)
// comes from included`

export const METADATA_READ_CODE = `const { data, links } = await api.get(
  'articles/1'
)

data.title        // an attribute, flat as always
data.$.meta       // the resource meta
data.$.links.self // the resource links

data.$.relationships.author.meta
data.$.relationships.author.links.related

links.next        // document links, including pagination`

export const METADATA_WRITE_CODE = `await api.create('article', {
  title: 'Hello world',
  author: { type: 'people', id: '9' },
  $: {
    lid: 'draft-1',
    meta: { draft: true },
    relationships: {
      author: { meta: { role: 'primary' } }
    }
  }
})`

export const METADATA_DOCUMENT_CODE = `await api.create(
  'article',
  { title: 'Hello world' },
  { document: { meta: { source: 'cli' } } }
)`

export const QUERY_REQUEST_CODE = `await api.get('articles', {
  params: {
    include: ['author', 'comments'],
    fields: { articles: ['title', 'body'] },
    filter: { published: true },
    sort: ['-createdAt'],
    page: { number: 1, size: 10 }
  }
})`

export const QUERY_FORMATTER_CODE = `import Fetchja from 'fetchja'

function bracketQueryFormatter (params) {
  const search = new URLSearchParams()

  for (const key in params) {
    const value = params[key]

    if (Array.isArray(value)) {
      value.forEach(item => search.append(\`\${key}[]\`, String(item)))
    } else {
      search.append(key, String(value))
    }
  }

  return search
}

const api = new Fetchja({
  baseURL: 'https://api.example.com',
  queryFormatter: bracketQueryFormatter
})`

export const CUSTOM_FETCH_CODE = `const api = new Fetchja({
  baseURL: 'https://api.example.com',
  fetch: (url, init) => myCustomFetch(url, init)
})`

export const ERRORS_CODE = `import Fetchja, { FetchjaError } from 'fetchja'

try {
  await api.get('articles/999')
} catch (error) {
  if (error instanceof FetchjaError) {
    console.log(error.status)
    console.log(error.statusText)
    console.log(error.errors)
    console.log(error.document)
    console.log(error.response)
  }
}`

export const RETRY_CODE = `const api = new Fetchja({
  baseURL: 'https://api.example.com',
  headers: { Authorization: \`Bearer \${getToken()}\` },
  onResponseError: async response => {
    if (response.status === 401) {
      api.headers.Authorization = \`Bearer \${await refreshToken()}\`

      return response.replayRequest()
    }
  }
})`

export const ATOMIC_CODE = `import Fetchja from 'fetchja'
import { AtomicOperations } from 'fetchja/atomic'

const api = new Fetchja({
  baseURL: 'https://api.example.com',
  extensions: [AtomicOperations]
})

const { results } = await api.atomic(op => [
  op.add('author', { lid: 'a1', name: 'dgeb' }),
  op.add('article', {
    title: 'JSON API paints my bikeshed!',
    author: { type: 'authors', lid: 'a1' }
  }),
  op.update('article', { id: '13', title: 'To TDD or Not' }),
  op.remove('article', '9')
])

results
// [{ type: 'authors', id: '9', name: 'dgeb' }, ...]`

export const ATOMIC_RELATIONSHIP_CODE = `const author = {
  type: 'articles',
  id: '13',
  relationship: 'author'
}

await api.atomic(op => [
  op.update(author, { type: 'people', id: '9' }),
  op.update(author, null)
])`

export const EXTENSION_CODE = `const timing = {
  name: 'timing',

  methods: api => ({
    ping: () => api.get('health')
  }),

  onRequest: context => {
    context.headers['X-Sent-At'] = String(Date.now())
  },

  onResponse: (payload, response) => payload,
  onError: error => console.warn(error.status)
}`

export const TANSTACK_QUERY_CODE = `import {
  useQuery
} from '@tanstack/react-query'
import Fetchja from 'fetchja'

const api = new Fetchja({
  baseURL: 'https://api.example.com'
})

function useArticles () {
  return useQuery({
    queryKey: ['articles'],
    queryFn: () => api.get('articles')
  })
}`

export const TANSTACK_MUTATION_CODE = `import {
  useMutation,
  useQueryClient
} from '@tanstack/react-query'

function useCreateArticle () {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: article => api.create('article', article),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['articles']
      })
    }
  })
}`

export const TYPESCRIPT_CODE = `import Fetchja, {
  type FetchjaOptions,
  type ResourceEnvelope,
  FetchjaError
} from 'fetchja'

const options: FetchjaOptions = {
  baseURL: 'https://api.example.com',
  resourceCase: 'kebab'
}

const api = new Fetchja(options)

interface Article {
  type: 'articles'
  id: string
  title: string
  $?: ResourceEnvelope
}`

export const CUSTOM_PLURAL_CODE = `import pluralize from 'pluralize'

const api = new Fetchja({
  baseURL: 'https://api.example.com',
  pluralize
})`

export const NO_PLURAL_CODE = `const api = new Fetchja({
  baseURL: 'https://api.example.com',
  pluralize: false
})`

export const FAQ = [
  {
    q: 'What is Fetchja?',
    a: [
      'Fetchja is a small JSON:API client built on native fetch. You work',
      'with plain objects while it serializes requests and resolves',
      'relationships from responses.'
    ].join(' ')
  },
  {
    q: 'What is JSON:API?',
    a: [
      'JSON:API is a specification for building JSON APIs with consistent',
      'resources, relationships, included data, filtering, sorting, fields,',
      'and pagination.'
    ].join(' ')
  },
  {
    q: 'How is Fetchja different from axios or kitsu?',
    a: [
      'Axios is a general HTTP client. Fetchja is focused on JSON:API.',
      'It was inspired by kitsu, but uses native fetch, has no runtime',
      'dependencies, and ships its own TypeScript types.'
    ].join(' ')
  },
  {
    q: 'Where does it run?',
    a: [
      'Anywhere fetch exists: Node 18+, Deno, Bun, and modern browsers.',
      'The package is ESM-only.'
    ].join(' ')
  },
  {
    q: 'Can I customize query strings?',
    a: [
      'Yes. The default formatter follows JSON:API 1.1, and you can pass',
      'queryFormatter when a server expects a different shape.'
    ].join(' ')
  },
  {
    q: 'Where do meta and links end up?',
    a: [
      'On the resource, under a reserved $ key: $.meta, $.links, $.lid,',
      'and the meta and links of each relationship. JSON:API forbids $ in',
      'member names, so it never clashes with one of your fields.',
      'Document-level meta, links, and jsonapi sit next to data.'
    ].join(' ')
  },
  {
    q: 'How do relationships work?',
    a: [
      'On write, nested objects with type and id are moved into JSON:API',
      'relationships and included data. On read, included resources are',
      'merged back into data so they behave like normal nested objects.'
    ].join(' ')
  }
] as const
