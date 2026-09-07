const results = document.querySelector('#results')
const count = document.querySelector('#result-count')
const form = document.querySelector('#search-form')
const input = document.querySelector('#search-input')

function renderStories(items) {
  count.textContent = `${String(items.length).padStart(2, '0')} resultados`
  results.innerHTML = items.length ? items.map(story => `
    <article class="story-card">
      <div class="card-meta"><span>${story.subreddit}</span><span>Reddit</span></div>
      <h3>${story.title}</h3>
      <p>${story.excerpt}</p>
      <span class="author">${story.author}</span>
    </article>
  `).join('') : '<p class="empty-state">Nenhuma história real encontrada para essa pesquisa.</p>'
}

form.addEventListener('submit', async event => {
  event.preventDefault()
  const term = input.value.trim()
  const subreddit = document.querySelector('#subreddit-select').value
  if (!term) return
  count.textContent = 'pesquisando…'
  results.innerHTML = '<p class="empty-state">Consultando o Reddit…</p>'
  try {
    const response = await fetch('http://localhost:3000/api/buscar-historias', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({term, subreddit}),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Falha ao consultar o Reddit.')
    renderStories(data.stories)
  } catch (error) {
    count.textContent = 'erro na busca'
    results.innerHTML = `<p class="empty-state">${error.message}</p>`
  }
})
