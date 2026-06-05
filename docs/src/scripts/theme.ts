const root = document.documentElement
const toggle = document.getElementById('themeToggle')

toggle?.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'

  root.setAttribute('data-theme', next)

  try {
    localStorage.setItem('fetchja-theme', next)
  } catch (error) {
    void error
  }
})
