const storySelect = document.querySelector('#story-select')
const dailyCount = document.querySelector('#daily-count')
const parts = document.querySelector('#parts')
const duration = document.querySelector('#duration')
const clipMeta = document.querySelector('#clip-meta')
const videoMode = document.querySelector('#video-mode')
const creationMode = document.querySelector('#creation-mode')
const modeHint = document.querySelector('#mode-hint')
const generate = document.querySelector('#generate')
const generateLabel = generate.querySelector('span')
const activateStoryScript = document.querySelector('#activate-story-script')
const storySearchCards = document.querySelector('#story-search-cards')
const storyScriptHint = document.querySelector('#story-script-hint')
const storyScriptModal = document.querySelector('#story-script-modal')
const scriptTerm = document.querySelector('#script-term')
const scriptLimit = document.querySelector('#script-limit')
const startStoryScript = document.querySelector('#start-story-script')
const scriptStatus = document.querySelector('#script-status')
const previewVideo = document.querySelector('#preview-video')
const previewText = document.querySelector('#preview-text')
const previewAuthor = document.querySelector('#preview-author')
const editTitle = document.querySelector('#edit-title')
const editText = document.querySelector('#edit-text')
const editAuthor = document.querySelector('#edit-author')
const progressBar = document.querySelector('#progress-bar')
const progressLabel = document.querySelector('#progress-label')
const status = document.querySelector('#status')
const speed = document.querySelector('#speed')
const speedValue = document.querySelector('#speed-value')
const steps = [...document.querySelectorAll('#steps li')]
let stories = []
let selectedVideo = false
let videoDuration = 0
let selectedVideos = []
let storyScriptActive = false

async function loadRemoteLibrary() {
  try {
    const index = await fetch('/api/library').then(response => response.json())
    stories = []
    for (const path of index.stories) {
      const data = await fetch(path).then(response => response.json())
      stories.push(...(data.stories || (Array.isArray(data) ? data : [data])))
    }
    storySelect.innerHTML = stories.map((story, index) => `<option value="${index}">${index + 1}. ${story.title || 'História sem título'}</option>`).join('')
    storySelect.disabled = !stories.length
    document.querySelector('#story-meta').textContent = `${stories.length} história(s) carregada(s) automaticamente`
    selectedVideos = index.videos
    selectedVideo = selectedVideos.length > 0
    document.querySelector('#video-meta').textContent = `${selectedVideos.length} vídeo(s) carregado(s) automaticamente`
    if (selectedVideo) {
      previewVideo.src = selectedVideos[0]
      previewVideo.play().catch(() => {})
    }
    updateStory()
  } catch (error) {
    status.textContent = 'Não foi possível ler a biblioteca local.'
    console.error('Falha ao carregar biblioteca:', error)
  }
}

async function loadStoryFiles(files) {
  if (!files.length) return
  stories = []
  for (const file of files.filter(item => item.name.toLowerCase().endsWith('.json'))) {
    const data = JSON.parse(await file.text())
    stories.push(...(data.stories || (Array.isArray(data) ? data : [data])))
  }
  storySelect.innerHTML = stories.map((story, index) => `<option value="${index}">${index + 1}. ${story.title || 'História sem título'}</option>`).join('')
  storySelect.disabled = false
  document.querySelector('#story-meta').textContent = `${stories.length} história(s) carregada(s) automaticamente`
  updateStory()
}

storySelect.addEventListener('change', updateStory)
creationMode.addEventListener('change', updateCreationMode)
activateStoryScript.addEventListener('click', () => { storyScriptModal.hidden = false; scriptTerm.focus() })
document.querySelector('#close-story-script').addEventListener('click', closeStoryScript)
document.querySelector('#cancel-story-script').addEventListener('click', closeStoryScript)
startStoryScript.addEventListener('click', startStorySearch)
for (const field of [dailyCount, parts, duration]) field.addEventListener('input', updateReady)
speed.addEventListener('input', () => { speedValue.textContent = `${Number(speed.value).toFixed(2)}×` })

function updateStory() {
  const story = stories[Number(storySelect.value)]
  if (!story) return
  editTitle.value = story.title || ''
  editText.value = story.text || story.excerpt || ''
  editAuthor.value = story.author || ''
  updatePreview()
  updateReady()
}

function updatePreview() {
  previewText.textContent = editText.value || 'Sem texto disponível.'
  previewAuthor.textContent = `${editAuthor.value || 'autor desconhecido'} · Reddit`
}

for (const field of [editTitle, editText, editAuthor]) field.addEventListener('input', updatePreview)

function updateReady() {
  generate.disabled = creationMode.value === 'automatic' ? !selectedVideo : !stories.length || !selectedVideo
}

function closeStoryScript() {
  storyScriptModal.hidden = true
}

async function startStorySearch() {
  const term = scriptTerm.value.trim()
  if (!term) {
    scriptStatus.textContent = 'Digite um tema antes de iniciar.'
    return
  }
  startStoryScript.disabled = true
  scriptStatus.textContent = 'Script iniciado. Aguardando o Reddit...'
  try {
    const response = await fetch('/api/story-script', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ term, limit: Number(scriptLimit.value) || 10 }) })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Falha ao iniciar o script')
    scriptStatus.textContent = `Pesquisando “${term}”...`
    status.textContent = `Script pesquisando: ${term}`
    await monitorStorySearch(result.jobId, result.output)
  } catch (error) {
    scriptStatus.textContent = `Erro: ${error.message}`
  } finally {
    startStoryScript.disabled = false
  }
}

async function monitorStorySearch(jobId, output) {
  for (;;) {
    await new Promise(resolve => setTimeout(resolve, 2000))
    const job = await fetch(`/api/story-script/${encodeURIComponent(jobId)}`).then(response => response.json())
    if (job.status === 'completed') {
      scriptStatus.textContent = `Concluído. JSON salvo em ${output}`
      status.textContent = 'Pesquisa concluída e adicionada à biblioteca.'
      await loadRemoteLibrary()
      return
    }
    if (job.status === 'failed') {
      throw new Error(`O script terminou com código ${job.exitCode ?? 'desconhecido'}.`)
    }
    scriptStatus.textContent = 'Pesquisando no Reddit...'
  }
}

function addStorySearchCard() {
  storyScriptActive = true
  const card = document.createElement('div')
  card.className = 'story-search-card'
  card.innerHTML = '<label>Tema da pesquisa<input class="story-theme" type="text" placeholder="ex.: relato sobrenatural"><button type="button" class="remove-card" aria-label="Remover tema">×</button></label>'
  card.querySelector('.remove-card').addEventListener('click', () => {
    card.remove()
    storyScriptActive = storySearchCards.children.length > 0
    storyScriptHint.textContent = storyScriptActive ? `${storySearchCards.children.length} tema(s) ativo(s).` : 'Sem script ativo: histórias sorteadas de toda a biblioteca.'
  })
  storySearchCards.append(card)
  storyScriptHint.textContent = `${storySearchCards.children.length} tema(s) ativo(s).`
  card.querySelector('input').focus()
}

function updateCreationMode() {
  const automatic = creationMode.value === 'automatic'
  storySelect.disabled = automatic || !stories.length
  document.querySelectorAll('.automatic-only').forEach(element => { element.hidden = !automatic })
  document.querySelectorAll('.manual-only').forEach(element => { element.hidden = automatic })
  generateLabel.textContent = automatic ? 'Criar tudo automaticamente' : 'Montar vídeo escolhido'
  modeHint.textContent = automatic
    ? 'O sistema sorteia a história, divide o texto e prepara todas as partes.'
    : 'Escolha a história, o título e o vídeo. Você revisa antes de montar.'
  updateReady()
}

generate.addEventListener('click', async () => {
  generate.disabled = true
  if (creationMode.value === 'automatic' && !stories.length) {
    status.textContent = 'Nenhuma história disponível. Execute o script de histórias primeiro.'
    storyScriptModal.hidden = false
    scriptTerm.focus()
    generate.disabled = false
    return
  }
  const batchCount = Math.max(1, Number(dailyCount.value) || 1)
  const selected = creationMode.value === 'automatic'
    ? chooseStory()
    : { story: stories[Number(storySelect.value)], index: Number(storySelect.value) }
  if (!selected) {
    status.textContent = 'Nenhuma história combina com o tema informado.'
    generate.disabled = false
    return
  }
  storySelect.value = String(selected.index)
  const partCount = Math.max(1, Number(parts.value) || 1)
  editTitle.value = selected.story.title || ''
  const fullText = selected.story.text || selected.story.excerpt || ''
  const textParts = splitText(fullText, partCount)
  editText.value = textParts[0] || ''
  editAuthor.value = selected.story.author || ''
  updatePreview()
  const secondsPerPart = Number(duration.value) || Math.max(10, Math.ceil(editText.value.length / 14 / partCount))
  const manual = videoMode.value === 'manual'
  const manualVideo = manual ? selectedVideos[0] : null
  if (manual && selectedVideos.length < partCount) {
    status.textContent = `Selecione ${partCount} vídeos para o modo manual.`
    generate.disabled = false
    return
  }
  const maxStart = Math.max(0, videoDuration - secondsPerPart)
  const start = manual ? 0 : Math.random() * maxStart
  if (manualVideo && previewVideo.src) {
    previewVideo.src = typeof manualVideo === 'string' ? manualVideo : URL.createObjectURL(manualVideo)
    previewVideo.currentTime = 0
  }
  previewVideo.currentTime = start
  clipMeta.textContent = `${manual ? 'Manual' : 'Sorteado'} · Parte 1/${partCount} · ${formatSeconds(start)} → ${formatSeconds(Math.min(start + secondsPerPart, videoDuration || start + secondsPerPart))}`
  for (const [index, label] of ['Sorteando histórias e trechos', 'Preparando partes', 'Gerando narrações Kokoro', 'Lote pronto para exportar'].entries()) {
    progressLabel.textContent = label.toLowerCase()
    progressBar.style.width = `${(index + 1) * 25}%`
    steps[index].classList.add('active')
    status.textContent = index === 3 ? `${batchCount} vídeo(s) preparado(s) para o dia` : `Lote de ${batchCount} · etapa ${index + 1} de 4 · ${label}`
    await new Promise(resolve => setTimeout(resolve, 700))
  }
  generate.disabled = false
  status.textContent = 'Prévia pronta. Você pode editar os campos e criar novamente.'
})

function chooseStory() {
  const themes = [...document.querySelectorAll('.story-theme')].map(input => input.value.trim().toLocaleLowerCase()).filter(Boolean)
  const candidates = stories.map((story, index) => ({ story, index })).filter(({ story }) => {
    if (!themes.length) return true
    const content = `${story.title || ''} ${story.text || story.excerpt || ''} ${story.subreddit || ''}`.toLocaleLowerCase()
    return themes.some(theme => content.includes(theme))
  })
  return candidates[Math.floor(Math.random() * candidates.length)]
}

function splitText(text, count) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return ['']
  const size = Math.ceil(words.length / count)
  return Array.from({ length: count }, (_, index) => words.slice(index * size, (index + 1) * size).join(' ')).filter(Boolean)
}

function formatSeconds(value) {
  if (!Number.isFinite(value)) return '—'
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

updateCreationMode()
loadRemoteLibrary()
