const storyFile = document.querySelector('#story-file')
const storySelect = document.querySelector('#story-select')
const videoFile = document.querySelector('#video-file')
const theme = document.querySelector('#theme')
const parts = document.querySelector('#parts')
const duration = document.querySelector('#duration')
const clipMeta = document.querySelector('#clip-meta')
const generate = document.querySelector('#generate')
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

storyFile.addEventListener('change', async () => {
  const file = storyFile.files[0]
  if (!file) return
  const data = JSON.parse(await file.text())
  stories = data.stories || (Array.isArray(data) ? data : [data])
  storySelect.innerHTML = stories.map((story, index) => `<option value="${index}">${index + 1}. ${story.title || 'História sem título'}</option>`).join('')
  storySelect.disabled = false
  document.querySelector('#story-file-label').textContent = file.name
  updateStory()
})

storySelect.addEventListener('change', updateStory)
for (const field of [theme, parts, duration]) field.addEventListener('input', updateReady)
videoFile.addEventListener('change', () => {
  const file = videoFile.files[0]
  if (!file) return
  selectedVideo = true
  previewVideo.src = URL.createObjectURL(file)
  previewVideo.addEventListener('loadedmetadata', () => {
    videoDuration = previewVideo.duration
    document.querySelector('#video-meta').textContent = `${(file.size / 1024 / 1024).toFixed(1)} MB · ${formatSeconds(videoDuration)} · vídeo local`
  }, { once: true })
  previewVideo.play().catch(() => {})
  document.querySelector('#video-file-label').textContent = file.name
  document.querySelector('#video-meta').textContent = `${(file.size / 1024 / 1024).toFixed(1)} MB · vídeo local`
  updateReady()
})
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

generate.addEventListener('click', async () => {
  generate.disabled = true
  const selected = chooseStory()
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
  const maxStart = Math.max(0, videoDuration - secondsPerPart)
  const start = Math.random() * maxStart
  previewVideo.currentTime = start
  clipMeta.textContent = `Parte 1/${partCount} · ${formatSeconds(start)} → ${formatSeconds(Math.min(start + secondsPerPart, videoDuration || start + secondsPerPart))}`
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
