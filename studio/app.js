const storyFile = document.querySelector('#story-file')
const storySelect = document.querySelector('#story-select')
const videoFile = document.querySelector('#video-file')
const generate = document.querySelector('#generate')
const previewVideo = document.querySelector('#preview-video')
const previewText = document.querySelector('#preview-text')
const previewAuthor = document.querySelector('#preview-author')
const progressBar = document.querySelector('#progress-bar')
const progressLabel = document.querySelector('#progress-label')
const status = document.querySelector('#status')
const speed = document.querySelector('#speed')
const speedValue = document.querySelector('#speed-value')
const steps = [...document.querySelectorAll('#steps li')]
let stories = []
let selectedVideo = false

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
videoFile.addEventListener('change', () => {
  const file = videoFile.files[0]
  if (!file) return
  selectedVideo = true
  previewVideo.src = URL.createObjectURL(file)
  previewVideo.play().catch(() => {})
  document.querySelector('#video-file-label').textContent = file.name
  document.querySelector('#video-meta').textContent = `${(file.size / 1024 / 1024).toFixed(1)} MB · vídeo local`
  updateReady()
})
speed.addEventListener('input', () => { speedValue.textContent = `${Number(speed.value).toFixed(2)}×` })

function updateStory() {
  const story = stories[Number(storySelect.value)]
  if (!story) return
  previewText.textContent = story.text || story.excerpt || 'Sem texto disponível.'
  previewAuthor.textContent = `${story.author || 'autor desconhecido'} · ${story.subreddit || 'Reddit'}`
  updateReady()
}

function updateReady() { generate.disabled = !stories.length || !selectedVideo }

generate.addEventListener('click', async () => {
  generate.disabled = true
  for (const [index, label] of ['Preparando texto', 'Gerando narração Kokoro', 'Montando vídeo', 'Prévia pronta'].entries()) {
    progressLabel.textContent = label.toLowerCase()
    progressBar.style.width = `${(index + 1) * 25}%`
    steps[index].classList.add('active')
    status.textContent = index === 3 ? 'Prévia pronta para exportar' : `Etapa ${index + 1} de 4 · ${label}`
    await new Promise(resolve => setTimeout(resolve, 700))
  }
  generate.disabled = false
})
