import { FAQ } from './content'
import { SITE } from './site'

export function softwareSourceCodeJsonLd () {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    'name': SITE.name,
    'description': SITE.description,
    'codeRepository': SITE.repo,
    'url': SITE.url,
    'programmingLanguage': 'TypeScript',
    'license': 'https://opensource.org/license/isc-license-txt',
    'author': {
      '@type': 'Person',
      'name': SITE.author.name,
      'url': SITE.author.url
    },
    'version': SITE.version
  }
}

export function softwareApplicationJsonLd () {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': SITE.name,
    'description': SITE.description,
    'url': SITE.url,
    'applicationCategory': 'DeveloperApplication',
    'operatingSystem': 'Node.js, Deno, Bun, Browser',
    'softwareVersion': SITE.version,
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'USD'
    },
    'author': {
      '@type': 'Person',
      'name': SITE.author.name,
      'url': SITE.author.url
    }
  }
}

export function faqJsonLd () {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': FAQ.map(item => ({
      '@type': 'Question',
      'name': item.q,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': item.a
      }
    }))
  }
}
