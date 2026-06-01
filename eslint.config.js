import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**']
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  stylistic.configs.customize({
    flat: true,
    semi: false,
    quotes: 'single',
    indent: 2,
    arrowParens: false,
    commaDangle: 'never',
    braceStyle: '1tbs'
  }),

  {
    rules: {
      // Keep the project's StandardJS-style spacing: a space before the
      // function parenthesis and binary operators at the end of a line.
      '@stylistic/space-before-function-paren': ['error', 'always'],
      '@stylistic/operator-linebreak': [
        'error',
        'after',
        { overrides: { '?': 'before', ':': 'before' } }
      ],
      '@stylistic/arrow-parens': ['error', 'as-needed'],

      // Prefer named function declarations over function expressions
      // and arrow functions assigned to variables.
      'func-style': ['error', 'declaration'],

      // Always use braces, never an inline `if`.
      'curly': ['error', 'all'],

      'no-var': 'error',
      'prefer-const': 'error',

      // Blank line before `return`/`throw` and after a `const` block.
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: '*', next: 'throw' },
        { blankLine: 'always', prev: ['const', 'let'], next: '*' },
        {
          blankLine: 'any',
          prev: ['const', 'let'],
          next: ['const', 'let']
        }
      ],

      '@stylistic/max-len': [
        'error',
        { code: 80, ignoreUrls: true, ignoreRegExpLiterals: true }
      ],

      // A JSON:API client works with arbitrary JSON payloads, so a few
      // `any` types at the parsing boundary are intentional.
      '@typescript-eslint/no-explicit-any': 'off',

      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' }
      ]
    }
  }
)
