#!/usr/bin/env node
import fs from 'node:fs/promises'
import process from 'node:process'
import { chromium } from 'playwright'

function argument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : fallback
}

const url = argument('url')
const term = argument('term')
const subreddit = argument('subreddit', 'historias')
const output = argument('output', 'historias.json')
if (!url || !term) {
  console.error('Uso: node automation/search.mjs --url URL_DO_POST --term "termo" [--subreddit historias] [--output historias.json]')
  process.exit(2)
}
if (!/^https?:\/\//.test(url)) {
  console.error('A opção --url precisa ser uma URL real começando com http:// ou https://.')
  console.error('Exemplo: --url "https://www.reddit.com/r/seusub/posts/abc123/..."')
  process.exit(2)
}

const headed = process.argv.includes('--headed')
const browser = await chromium.launchPersistentContext('.automation-profile', {headless: !headed})
const page = await browser.newPage()
try {
  await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 60000})
  await page.locator('#search-input').fill(term)
  await page.locator('#subreddit-select').selectOption(subreddit)
  await page.locator('#search-form').evaluate(form => form.requestSubmit())
  await page.locator('#result-count').waitFor({state: 'visible', timeout: 60000})
  await page.waitForFunction(() => !document.querySelector('#result-count')?.textContent?.includes('pesquisando'))
  const stories = await page.locator('.story-card').evaluateAll(cards => cards.map(card => ({
    subreddit: card.querySelector('.card-meta span')?.textContent?.trim() || '',
    title: card.querySelector('h3')?.textContent?.trim() || '',
    excerpt: card.querySelector('p')?.textContent?.trim() || '',
    author: card.querySelector('.author')?.textContent?.trim() || '',
    url: card.querySelector('.author')?.getAttribute('href') || '',
  })))
  const result = {term, subreddit: `r/${subreddit}`, collectedAt: new Date().toISOString(), stories}
  await fs.writeFile(output, `${JSON.stringify(result, null, 2)}\n`)
  console.log(`Pesquisa concluída: ${stories.length} história(s) salvas em ${output}`)
} finally {
  await browser.close()
}
