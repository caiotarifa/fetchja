const IRREGULARS = new Map([
  ['child', 'children'],
  ['foot', 'feet'],
  ['goose', 'geese'],
  ['man', 'men'],
  ['mouse', 'mice'],
  ['person', 'people'],
  ['tooth', 'teeth'],
  ['woman', 'women']
])

const IRREGULAR_PLURALS = new Set(IRREGULARS.values())

const UNCOUNTABLES = new Set([
  'cash',
  'data',
  'equipment',
  'feedback',
  'fish',
  'information',
  'media',
  'sheep',
  'staff'
])

/**
 * Pluralize an English word using a small set of common rules.
 *
 * This is a lightweight, dependency-free helper that covers the cases
 * most JSON:API resource names need. It is intentionally simple and
 * idempotent: a word that already looks plural is returned unchanged.
 * Common irregulars (`person` becoming `people`) and uncountables
 * (`equipment`) are handled; for anything fancier, inject a fuller
 * implementation through the `pluralize` option.
 *
 * @param word - The word to pluralize.
 * @returns The pluralized word.
 */
export function pluralize (word: string): string {
  if (word === '') {
    return word
  }

  const lower = word.toLowerCase()

  // Uncountables and already-irregular plurals stay unchanged:
  // equipment -> equipment, people -> people.
  if (UNCOUNTABLES.has(lower) || IRREGULAR_PLURALS.has(lower)) {
    return word
  }

  // Irregular singulars: person -> people, child -> children.
  const irregular = IRREGULARS.get(lower)

  if (irregular !== undefined) {
    return irregular
  }

  // Singular words ending in "is" swap it for "es":
  // analysis -> analyses, diagnosis -> diagnoses.
  if (/is$/i.test(word)) {
    return word.replace(/is$/i, 'es')
  }

  // Singular words ending in "us" or "ss" take "es": status -> statuses,
  // bus -> buses, address -> addresses, class -> classes.
  if (/(us|ss)$/i.test(word)) {
    return `${word}es`
  }

  // Anything else ending in "s" is treated as already plural.
  if (/s$/i.test(word)) {
    return word
  }

  // A consonant followed by "y" becomes "ies": category -> categories.
  if (/[^aeiou]y$/i.test(word)) {
    return word.replace(/y$/i, 'ies')
  }

  // Sibilant endings take "es": box -> boxes, match -> matches.
  if (/(x|z|ch|sh)$/i.test(word)) {
    return `${word}es`
  }

  return `${word}s`
}
