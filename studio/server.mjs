import { createServer } from 'node:http'
import { mkdir, readFile, readdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { extname, join, normalize, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const studioDir = join(root, 'studio')
const libraryDir = join(root, 'biblioteca')
const port = Number(process.env.STUDIO_PORT || 8090)
const botSubreddit = process.env.BOT_SUBREDDIT || 'mybothistoriador_dev'
const jobs = new Map()

async function filesUnder(directory, allowed) {
  const result = []
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name)
      if (entry.isDirectory()) await walk(path)
      else if (allowed.has(extname(entry.name).toLowerCase())) result.push(path)
    }
  }
  await walk(directory)
  return result
}

async function getLibrary() {
  const stories = await filesUnder(join(libraryDir, 'historias'), new Set(['.json']))
  const videos = await filesUnder(join(libraryDir, 'videos'), new Set(['.mp4', '.webm', '.mov', '.m4v']))
  const publicPath = path => `/library/${relative(libraryDir, path).split('\\').join('/')}`
  return { stories: stories.map(publicPath), videos: videos.map(publicPath) }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`)
    if (url.pathname === '/api/video-jobs' && request.method === 'POST') {
      const chunks = []
      for await (const chunk of request) chunks.push(chunk)
      const body = JSON.parse(Buffer.concat(chunks).toString() || '{}')
      const count = Math.min(30, Math.max(1, Number(body.count) || 6))
      const parts = Math.min(20, Math.max(1, Number(body.parts) || 2))
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const output = join(libraryDir, 'gerados', new Date().toISOString().slice(0, 10), id)
      await mkdir(output, { recursive: true })
      const job = { id, status: 'running', count, parts, output: relative(root, output), startedAt: new Date().toISOString() }
      jobs.set(id, job)
      const child = spawn('python3', ['video/render.py', '--stories', join(libraryDir, 'historias'), '--videos', join(libraryDir, 'videos'), '--output', output, '--count', String(count), '--parts', String(parts), '--duration', String(body.duration || 0)], { cwd: root, detached: true, stdio: 'ignore' })
      child.once('close', code => {
        job.status = code === 0 ? 'completed' : 'failed'
        job.exitCode = code
        job.finishedAt = new Date().toISOString()
      })
      child.unref()
      response.writeHead(202, { 'content-type': 'application/json' })
      response.end(JSON.stringify(job))
      return
    }
    if (url.pathname.startsWith('/api/video-jobs/') && request.method === 'GET') {
      const id = decodeURIComponent(url.pathname.slice('/api/video-jobs/'.length))
      const job = jobs.get(id)
      if (!job) {
        response.writeHead(404, { 'content-type': 'application/json' })
        response.end(JSON.stringify({ error: 'Job não encontrado.' }))
        return
      }
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify(job))
      return
    }
    if (url.pathname === '/api/story-script' && request.method === 'POST') {
      const chunks = []
      for await (const chunk of request) chunks.push(chunk)
      const body = JSON.parse(Buffer.concat(chunks).toString() || '{}')
      const term = String(body.term || '').trim()
      const limit = Math.min(50, Math.max(1, Number(body.limit) || 10))
      if (!term) {
        response.writeHead(400, { 'content-type': 'application/json' })
        response.end(JSON.stringify({ error: 'Informe um tema.' }))
        return
      }
      const slug = term.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'sem-tema'
      const directory = join(libraryDir, 'historias', slug)
      await mkdir(directory, { recursive: true })
      const output = join(directory, `historias-${Date.now()}.json`)
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      jobs.set(id, { id, term, status: 'running', output: relative(root, output), startedAt: new Date().toISOString() })
      const child = spawn(process.execPath, ['automation/search.mjs', '--bot-subreddit', botSubreddit, '--term', term, '--limit', String(limit), '--subreddit', 'historias', '--output', output], { cwd: root, detached: true, stdio: 'ignore' })
      child.once('close', code => {
        const job = jobs.get(id)
        if (!job) return
        job.status = code === 0 ? 'completed' : 'failed'
        job.exitCode = code
        job.finishedAt = new Date().toISOString()
      })
      child.unref()
      response.writeHead(202, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ started: true, jobId: id, term, limit, output: relative(root, output) }))
      return
    }
    if (url.pathname.startsWith('/api/story-script/') && request.method === 'GET') {
      const id = decodeURIComponent(url.pathname.slice('/api/story-script/'.length))
      const job = jobs.get(id)
      if (!job) {
        response.writeHead(404, { 'content-type': 'application/json' })
        response.end(JSON.stringify({ error: 'Pesquisa não encontrada.' }))
        return
      }
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify(job))
      return
    }
    if (url.pathname === '/api/library') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
      response.end(JSON.stringify(await getLibrary()))
      return
    }
    const base = url.pathname.startsWith('/library/') ? libraryDir : studioDir
    const requested = decodeURIComponent(url.pathname.replace(/^\/(library\/)?/, '')) || 'index.html'
    const target = normalize(join(base, requested))
    if (!target.startsWith(base)) throw new Error('Caminho inválido')
    response.writeHead(200)
    response.end(await readFile(target))
  } catch (error) {
    if (!response.headersSent) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'content-type': 'text/plain; charset=utf-8' })
      response.end(error.code === 'ENOENT' ? 'Não encontrado' : 'Erro no servidor do Studio')
    } else if (!response.writableEnded) {
      response.end()
    }
    console.error('Erro no Studio:', error)
  }
})

server.listen(port, '127.0.0.1', () => console.log(`Historiador Studio: http://localhost:${port}`))
