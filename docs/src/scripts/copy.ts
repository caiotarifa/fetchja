function copyIcon (): string {
  return [
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"',
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
    '<rect x="9" y="9" width="11" height="11" rx="2"/>',
    '<path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    '</svg>'
  ].join(' ')
}

function checkIcon (): string {
  return [
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"',
    'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">',
    '<path d="M20 6 9 17l-5-5"/>',
    '</svg>'
  ].join(' ')
}

function restoreLabel (
  labelEl: HTMLElement,
  value: string | null
): void {
  labelEl.textContent = value
}

function restoreIcon (iconEl: Element): void {
  iconEl.innerHTML = copyIcon()
}

function flash (
  btn: HTMLElement,
  labelEl: HTMLElement | null
): void {
  btn.classList.add('copied')

  if (labelEl) {
    const prev = labelEl.textContent

    labelEl.textContent = 'Copied'
    setTimeout(() => restoreLabel(labelEl, prev), 1400)
  }

  const iconEl = btn.querySelector('.ci')

  if (iconEl) {
    iconEl.innerHTML = checkIcon()
    setTimeout(() => restoreIcon(iconEl), 1400)
  }

  setTimeout(() => btn.classList.remove('copied'), 1400)
}

function fallbackCopy (text: string): void {
  const textarea = document.createElement('textarea')

  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()

  try {
    document.execCommand('copy')
  } catch (error) {
    void error
  }

  document.body.removeChild(textarea)
}

async function doCopy (
  text: string,
  btn: HTMLElement,
  labelEl: HTMLElement | null
): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch (error) {
    void error
    fallbackCopy(text)
  }

  flash(btn, labelEl)
}

document.querySelectorAll<HTMLElement>('[data-copy]').forEach(btn => {
  const label = btn.querySelector<HTMLElement>('.ct')

  btn.addEventListener('click', () =>
    doCopy(btn.getAttribute('data-copy') ?? '', btn, label)
  )
})
