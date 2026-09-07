import { createServer } from 'node:http'
import { readFile, readdir } from 'node:fs/promises'
import { extname, join, normalize, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const studioDir = join(root, 'studio')
const libraryDir = join(root, 'biblioteca')
const port = Number(process.env.STUDIO_PORT || 8090)

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
    response.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'content-type': 'text/plain; charset=utf-8' })
    response.end(error.code === 'ENOENT' ? 'Não encontrado' : 'Erro no servidor do Studio')
  }
})

server.listen(port, '127.0.0.1', () => console.log(`Historiador Studio: http://localhost:${port}`))
