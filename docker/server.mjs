import http from 'node:http'

const port = Number(process.env.PORT || 3000)
const allowedSubreddits = new Set(['historias', 'desabafos', 'conversas'])
let accessToken = null
let accessTokenExpiresAt = 0

function json(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString() || '{}')
}

async function getAccessToken() {
  if (accessToken && Date.now() < accessTokenExpiresAt) return accessToken
  const {REDDIT_CLIENT_ID: clientId, REDDIT_CLIENT_SECRET: clientSecret, REDDIT_REFRESH_TOKEN: refreshToken} = process.env
  if (!clientId || !clientSecret || !refreshToken) throw new Error('OAuth do Reddit não configurado. Preencha docker/.env.')
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const body = new URLSearchParams({grant_type: 'refresh_token', refresh_token: refreshToken})
  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'mybothistoriador/0.1'},
    body,
  })
  if (!response.ok) throw new Error(`Falha no OAuth do Reddit (HTTP ${response.status})`)
  const data = await response.json()
  accessToken = data.access_token
  accessTokenExpiresAt = Date.now() + Math.max(60, data.expires_in - 60) * 1000
  return accessToken
}

async function searchReddit({term, subreddit}) {
  const query = new URLSearchParams({q: term, restrict_sr: 'on', sort: 'relevance', t: 'all', limit: '10', raw_json: '1'})
  const url = `https://oauth.reddit.com/r/${subreddit}/search.json?${query}`
  const response = await fetch(url, {
    headers: {'Authorization': `Bearer ${await getAccessToken()}`, 'User-Agent': 'mybothistoriador/0.1'},
  })
  if (!response.ok) throw new Error(`Reddit respondeu HTTP ${response.status}`)
  const data = await response.json()
  return data.data.children.map(({data: post}) => ({
    id: post.id,
    subreddit: `r/${post.subreddit}`,
    title: post.title,
    author: post.author ? `u/${post.author}` : 'autor deletado',
    excerpt: post.selftext?.slice(0, 240) || 'Esta publicação não possui texto disponível.',
    text: post.selftext || '',
    url: `https://www.reddit.com${post.permalink}`,
    createdUtc: post.created_utc,
  }))
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {})
  if (req.method !== 'POST' || req.url !== '/api/buscar-historias') return json(res, 404, {error: 'rota não encontrada'})

  try {
    const body = await readBody(req)
    const term = typeof body.term === 'string' ? body.term.trim() : ''
    const subreddit = typeof body.subreddit === 'string' ? body.subreddit.replace(/^r\//, '').trim().toLowerCase() : ''
    if (!term) return json(res, 400, {error: 'Informe um termo de pesquisa.'})
    if (!allowedSubreddits.has(subreddit)) return json(res, 400, {error: 'Subreddit não permitido.'})
    const stories = await searchReddit({term, subreddit})
    return json(res, 200, {stories})
  } catch (error) {
    console.error(new Date().toISOString(), error)
    return json(res, 502, {error: error instanceof Error ? error.message : 'Falha ao consultar o Reddit.'})
  }
})

server.listen(port, '0.0.0.0', () => console.log(`API real do Reddit em http://0.0.0.0:${port}`))
