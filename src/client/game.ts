import {Endpoint, type SearchStoriesRsp, type Story} from '../shared/api.ts'

const form = document.querySelector('#search-form') as HTMLFormElement
const input = document.querySelector('#search-input') as HTMLInputElement
const subreddit = document.querySelector(
  '#subreddit-select',
) as HTMLSelectElement
const results = document.querySelector('#results') as HTMLDivElement
const count = document.querySelector('#result-count') as HTMLSpanElement

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    char =>
      ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'})[
        char
      ] ?? char,
  )
}
function renderStories(stories: Story[]): void {
  count.textContent = `${String(stories.length).padStart(2, '0')} resultados`
  results.innerHTML = stories.length
    ? stories
        .map(
          story =>
            `<article class="story-card"><div class="card-meta"><span>${story.subreddit}</span><span>Reddit</span></div><h3>${escapeHtml(story.title)}</h3><p>${escapeHtml(story.excerpt)}</p><a class="author" href="${story.url}" target="_blank" rel="noreferrer">${escapeHtml(story.author)} ↗</a></article>`,
        )
        .join('')
    : '<p class="empty-state">Nenhuma história encontrada para essa pesquisa.</p>'
}

form.addEventListener('submit', async event => {
  event.preventDefault()
  const term = input.value.trim()
  if (!term) return
  count.textContent = 'pesquisando…'
  results.innerHTML = '<p class="empty-state">Consultando o Reddit…</p>'
  try {
    const response = await fetch(Endpoint.SearchStories, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({term, subreddit: subreddit.value}),
    })
    const data = (await response.json()) as SearchStoriesRsp | {error?: string}
    if (!response.ok || !('stories' in data))
      throw Error('error' in data ? data.error : 'Falha ao consultar o Reddit.')
    renderStories(data.stories)
  } catch (error) {
    count.textContent = 'erro na busca'
    results.innerHTML = `<p class="empty-state">${escapeHtml(error instanceof Error ? error.message : 'Falha ao consultar o Reddit.')}</p>`
  }
})
