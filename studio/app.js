const storySelect = document.querySelector('#story-select')
const theme = document.querySelector('#theme')
const parts = document.querySelector('#parts')
const duration = document.querySelector('#duration')
const clipMeta = document.querySelector('#clip-meta')
const videoMode = document.querySelector('#video-mode')
const creationMode = document.querySelector('#creation-mode')
const modeHint = document.querySelector('#mode-hint')
const generate = document.querySelector('#generate')
const generateLabel = generate.querySelector('span')
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

async function loadRemoteLibrary() {
  try {
    const index = await fetch('/api/library').then(response => response.json())
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
for (const field of [theme, parts, duration]) field.addEventListener('input', updateReady)
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

function updateReady() { generate.disabled = !stories.length || !selectedVideo }

function updateCreationMode() {
  const automatic = creationMode.value === 'automatic'
  document.querySelectorAll('.automatic-only').forEach(element => { element.hidden = !automatic })
  document.querySelectorAll('.manual-only').forEach(element => { element.hidden = automatic })
  generateLabel.textContent = automatic ? 'Criar tudo automaticamente' : 'Montar vídeo escolhido'
  modeHint.textContent = automatic
    ? 'O sistema sorteia a história, divide o texto e prepara todas as partes.'
    : 'Escolha a história, o título e o vídeo. Você revisa antes de montar.'
}

generate.addEventListener('click', async () => {
  generate.disabled = true
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
  for (const [index, label] of ['Sorteando história e trecho', 'Preparando partes', 'Gerando narração Kokoro', 'Prévia pronta'].entries()) {
    progressLabel.textContent = label.toLowerCase()
    progressBar.style.width = `${(index + 1) * 25}%`
    steps[index].classList.add('active')
    status.textContent = index === 3 ? 'Prévia pronta para exportar' : `Etapa ${index + 1} de 4 · ${label}`
    await new Promise(resolve => setTimeout(resolve, 700))
  }
  generate.disabled = false
  status.textContent = 'Prévia pronta. Você pode editar os campos e criar novamente.'
})

function chooseStory() {
  const query = theme.value.trim().toLocaleLowerCase()
  const candidates = stories.map((story, index) => ({ story, index })).filter(({ story }) => {
    if (!query) return true
    return `${story.title || ''} ${story.text || story.excerpt || ''} ${story.subreddit || ''}`.toLocaleLowerCase().includes(query)
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
