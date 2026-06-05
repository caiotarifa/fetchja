export const BRAND_MARK = {
  viewBox: '0 0 40 40',
  strokeWidth: 2.2,
  dotRadius: 2.4,
  leftBrace: [
    'M15 7c-3.2 0-3.5 2.2-3.5 5.3',
    '0 3-0.8 4.7-3 4.7',
    '2.2 0 3 1.7 3 4.7',
    '0 3.1 0.3 5.3 3.5 5.3'
  ].join(' '),
  rightBrace: [
    'M25 7c3.2 0 3.5 2.2 3.5 5.3',
    '0 3 0.8 4.7 3 4.7',
    '-2.2 0-3 1.7-3 4.7',
    '0 3.1-0.3 5.3-3.5 5.3'
  ].join(' '),
  line: {
    x1: 20,
    x2: 20,
    y1: 16.4,
    y2: 23.6
  },
  topDot: {
    cx: 20,
    cy: 14
  },
  bottomDot: {
    cx: 20,
    cy: 26
  }
}

export function brandMarkPaths ({
  mark = 'currentColor',
  accent = 'var(--accent)'
} = {}) {
  return [
    '<path',
    ` d="${BRAND_MARK.leftBrace}"`,
    ` stroke="${mark}"`,
    ' stroke-linecap="round"',
    ` stroke-width="${BRAND_MARK.strokeWidth}"`,
    ' fill="none"',
    '/>',
    '<path',
    ` d="${BRAND_MARK.rightBrace}"`,
    ` stroke="${mark}"`,
    ' stroke-linecap="round"',
    ` stroke-width="${BRAND_MARK.strokeWidth}"`,
    ' fill="none"',
    '/>',
    '<circle',
    ` cx="${BRAND_MARK.topDot.cx}"`,
    ` cy="${BRAND_MARK.topDot.cy}"`,
    ` r="${BRAND_MARK.dotRadius}"`,
    ` fill="${mark}"`,
    '/>',
    '<circle',
    ` cx="${BRAND_MARK.bottomDot.cx}"`,
    ` cy="${BRAND_MARK.bottomDot.cy}"`,
    ` r="${BRAND_MARK.dotRadius}"`,
    ` fill="${accent}"`,
    '/>',
    '<line',
    ` x1="${BRAND_MARK.line.x1}"`,
    ` x2="${BRAND_MARK.line.x2}"`,
    ` y1="${BRAND_MARK.line.y1}"`,
    ` y2="${BRAND_MARK.line.y2}"`,
    ` stroke="${mark}"`,
    ' stroke-linecap="round"',
    ` stroke-width="${BRAND_MARK.strokeWidth}"`,
    '/>'
  ].join('')
}

export function brandMarkSvg ({
  mark = 'currentColor',
  accent = 'var(--accent)',
  style = ''
} = {}) {
  const styles = style ? `<style>${style}</style>` : ''

  return [
    '<svg xmlns="http://www.w3.org/2000/svg"',
    ` viewBox="${BRAND_MARK.viewBox}"`,
    ' fill="none">',
    styles,
    brandMarkPaths({ mark, accent }),
    '</svg>'
  ].join('')
}
