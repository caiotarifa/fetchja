import { Buffer } from 'node:buffer'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { brandMarkPaths } from '../src/lib/brand.js'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const docsDir = resolve(scriptDir, '..')
const rootDir = resolve(docsDir, '..')
const publicDir = resolve(docsDir, 'public')
const readmePath = resolve(rootDir, 'README.md')
const packagePath = resolve(rootDir, 'package.json')
const cnamePath = resolve(publicDir, 'CNAME')
const faviconPngSizes = [16, 32, 48]
const appleTouchIconSize = 180

function faviconSvg () {
  const mark = brandMarkPaths({
    mark: '#191320',
    accent: '#c026d3'
  })

  return [
    '<svg xmlns="http://www.w3.org/2000/svg"',
    ' width="32" height="32" viewBox="7.2 5.6 25.6 22.8"',
    ' fill="none" preserveAspectRatio="none">',
    mark,
    '</svg>'
  ].join('')
}

function ogSvg ({ packageData }) {
  const title = escapeHtml(packageData.name)
  const mark = brandMarkPaths({
    mark: '#201923',
    accent: '#c026d3'
  })
  const description = [
    'Zero-dependency JSON:API requests, relationship resolution,',
    'and plain-object responses on the native Fetch API.'
  ]

  return [
    '<svg xmlns="http://www.w3.org/2000/svg"',
    ' width="1200" height="630" viewBox="0 0 1200 630">',
    '<defs>',
    '<pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">',
    '<path d="M44 0H0V44" fill="none" stroke="#e5c9ee" stroke-width="1"/>',
    '</pattern>',
    '<linearGradient id="fade" x1="0" x2="1" y1="0" y2="1">',
    '<stop offset="0" stop-color="#ffffff"/>',
    '<stop offset="1" stop-color="#f6e4ff"/>',
    '</linearGradient>',
    '</defs>',
    '<rect width="1200" height="630" fill="url(#fade)"/>',
    '<rect width="1200" height="630" fill="url(#grid)" opacity="0.66"/>',
    '<rect x="72" y="72" width="1056" height="486" rx="36"',
    ' fill="#fffefe" stroke="#eadfec" stroke-width="2"/>',
    '<g transform="translate(102 106) scale(2.55)">',
    mark,
    '</g>',
    '<text x="230" y="180" font-family="Space Grotesk, Arial, sans-serif"',
    ' font-size="96" font-weight="700" letter-spacing="0" fill="#201923">',
    title.slice(0, 5),
    '<tspan fill="#c026d3">',
    title.slice(5),
    '</tspan>',
    '</text>',
    '<text x="104" y="282" font-family="Space Grotesk, Arial, sans-serif"',
    ' font-size="44" font-weight="600" fill="#201923">',
    'Tiny JSON:API client built on fetch',
    '</text>',
    descriptionLine(104, 346, description[0]),
    descriptionLine(104, 386, description[1]),
    metric(104, 428, '~5KB', 'minified'),
    metric(330, 428, '0', 'dependencies'),
    metric(556, 428, 'ESM', 'native modules'),
    '</svg>'
  ].join('')
}

function descriptionLine (x, y, text) {
  return [
    `<text x="${x}" y="${y}"`,
    ' font-family="Arial, sans-serif"',
    ' font-size="27" fill="#5f5364">',
    escapeHtml(text),
    '</text>'
  ].join('')
}

function metric (x, y, value, label) {
  return [
    `<rect x="${x}" y="${y}" width="182" height="78" rx="18"`,
    ' fill="#fbf7fd" stroke="#eadfec" stroke-width="1"/>',
    `<text x="${x + 24}" y="${y + 39}"`,
    ' font-family="JetBrains Mono, monospace" font-size="28"',
    ' font-weight="700" fill="#c026d3">',
    escapeHtml(value),
    '</text>',
    `<text x="${x + 24}" y="${y + 62}"`,
    ' font-family="JetBrains Mono, monospace" font-size="15"',
    ' font-weight="600" fill="#6f6574">',
    escapeHtml(label),
    '</text>'
  ].join('')
}

function llmsText ({ packageData, readme, siteUrl }) {
  const title = readme.match(/^# (.+)$/m)?.[1] ?? packageData.name
  const tagline =
    readme.match(/^\*\*(.+)\*\*$/m)?.[1] ??
    packageData.description
  const repository = repositoryUrl(packageData)

  return [
    `# ${title}`,
    '',
    `> ${tagline}`,
    '',
    [
      'Fetchja turns plain objects into JSON:API requests and turns',
      'responses back into plain objects with relationships already',
      'resolved from included.'
    ].join(' '),
    '',
    '## Key facts',
    '- Zero runtime dependencies; uses the built-in fetch.',
    '- About 5KB minified. Ships its own TypeScript types.',
    '- Methods: get/fetch, post/create, patch/update, delete/remove.',
    '- JSON:API 1.1 compliant query serialization.',
    '- Throws FetchjaError; onResponseError can retry via replayRequest().',
    '',
    '## Links',
    `- Site: ${siteUrl}`,
    `- Repository: ${repository}`,
    `- npm: https://www.npmjs.com/package/${packageData.name}`,
    '- JSON:API spec: https://jsonapi.org',
    `- Full docs: ${siteUrl}/llms-full.txt`
  ].join('\n')
}

function llmsFullText (readme) {
  return readme
    .replace(/\r\n/g, '\n')
    .replace(/\n## Contents\n[\s\S]*?\n## Why Fetchja\?/u, '\n## Why Fetchja?')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1 ($2)')
    .replace(/\*\*/g, '')
    .replace(/\p{Extended_Pictographic}\ufe0f?\s*/gu, '')
    .replace(/\u2014/g, '-')
    .replace(/\u2013/g, '-')
    .replace(/\u2192/g, '->')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

function repositoryUrl (packageData) {
  return packageData.repository.url
    .replace(/^git\+/, '')
    .replace(/\.git$/, '')
}

function escapeHtml (value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function errorMessage (error) {
  const message = error.stack || error

  return `${message}\n`
}

async function readJson (path) {
  const contents = await readFile(path, 'utf8')

  return JSON.parse(contents)
}

async function readSiteUrl () {
  const domain = (await readFile(cnamePath, 'utf8')).trim()

  return `https://${domain}`
}

async function writeTextAsset (name, contents) {
  await writeFile(resolve(publicDir, name), `${contents.trim()}\n`)
}

async function writeBinaryAsset (name, contents) {
  await writeFile(resolve(publicDir, name), contents)
}

async function pngBuffer (svg, size) {
  return sharp(Buffer.from(svg), { density: 512 })
    .resize(size, size, { fit: 'fill' })
    .png()
    .toBuffer()
}

async function writePngAsset (name, svg) {
  await sharp(Buffer.from(svg))
    .png()
    .toFile(resolve(publicDir, name))
}

async function faviconPngAssets (svg) {
  return Promise.all(
    faviconPngSizes.map(async function faviconPngAsset (size) {
      const buffer = await pngBuffer(svg, size)

      return { size, buffer }
    })
  )
}

function icoBuffer (images) {
  const directoryOffset = 6
  const imageOffset = directoryOffset + images.length * 16
  const entries = images.reduce(function addOffset (state, image) {
    const entry = { ...image, offset: state.offset }

    return {
      offset: state.offset + image.buffer.length,
      items: [...state.items, entry]
    }
  }, { offset: imageOffset, items: [] }).items

  return Buffer.concat([
    icoHeader(images.length),
    ...entries.map(icoDirectoryEntry),
    ...images.map(image => image.buffer)
  ])
}

function icoHeader (count) {
  const header = Buffer.alloc(6)

  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(count, 4)

  return header
}

function icoDirectoryEntry ({ size, buffer, offset }) {
  const entry = Buffer.alloc(16)

  entry.writeUInt8(iconDimension(size), 0)
  entry.writeUInt8(iconDimension(size), 1)
  entry.writeUInt8(0, 2)
  entry.writeUInt8(0, 3)
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(buffer.length, 8)
  entry.writeUInt32LE(offset, 12)

  return entry
}

function iconDimension (size) {
  return size >= 256 ? 0 : size
}

async function main () {
  await mkdir(publicDir, { recursive: true })

  const [readme, packageData, siteUrl] = await Promise.all([
    readFile(readmePath, 'utf8'),
    readJson(packagePath),
    readSiteUrl()
  ])
  const iconSvg = faviconSvg()
  const faviconPngs = await faviconPngAssets(iconSvg)
  const appleTouchIcon = await pngBuffer(iconSvg, appleTouchIconSize)

  await Promise.all([
    writeTextAsset('favicon.svg', iconSvg),
    writeBinaryAsset('favicon.ico', icoBuffer(faviconPngs)),
    ...faviconPngs.map(({ size, buffer }) => (
      writeBinaryAsset(`favicon-${size}x${size}.png`, buffer)
    )),
    writeBinaryAsset('apple-touch-icon.png', appleTouchIcon),
    writePngAsset('og.png', ogSvg({ packageData })),
    writeTextAsset('llms.txt', llmsText({ packageData, readme, siteUrl })),
    writeTextAsset('llms-full.txt', llmsFullText(readme))
  ])
}

main().catch(function handleError (error) {
  process.stderr.write(errorMessage(error))
  process.exitCode = 1
})
