const els = document.querySelectorAll<HTMLElement>('.reveal')

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in')
          io.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  )

  els.forEach((el, i) => {
    el.style.transitionDelay = `${(i % 3) * 70}ms`
    io.observe(el)
  })
} else {
  els.forEach(el => el.classList.add('in'))
}
