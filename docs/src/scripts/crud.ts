const explorer = document.getElementById('crudExplorer')

if (explorer) {
  const steps = Array.from(
    explorer.querySelectorAll<HTMLElement>('.crud-step')
  )
  const states = Array.from(
    explorer.querySelectorAll<HTMLElement>('.resp-state')
  )
  const active = { value: 0 }

  function activate (index: number): void {
    if (index === active.value) {
      return
    }

    steps[active.value].classList.remove('is-active')
    states[active.value].classList.remove('is-active')
    steps[active.value].setAttribute('aria-selected', 'false')

    active.value = index

    steps[active.value].classList.add('is-active')
    states[active.value].classList.add('is-active')
    steps[active.value].setAttribute('aria-selected', 'true')
  }

  steps.forEach((step, index) => {
    step.addEventListener('click', () => activate(index))
  })
}
