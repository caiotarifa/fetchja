/**
 * Pluralize an English word using a small set of common rules.
 *
 * This is a lightweight, dependency-free helper that covers the cases
 * most JSON:API resource names need. It is intentionally simple and
 * idempotent: a word that already looks plural is returned unchanged.
 * For irregular words (such as `person` becoming `people`), inject a
 * fuller implementation through the `pluralize` option.
 *
 * @param word - The word to pluralize.
 * @returns The pluralized word.
 */
export function pluralize (word: string): string {
  if (word === '') {
    return word
  }

  // Singular words ending in "us" take "es": status -> statuses,
  // bus -> buses, virus -> viruses.
  if (/us$/i.test(word)) {
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
