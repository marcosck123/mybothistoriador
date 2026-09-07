#!/usr/bin/env node
import fs from 'node:fs/promises'
import process from 'node:process'
import { chromium } from 'playwright'

function argument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : fallback
}

const term = argument('term')
const subreddit = argument('subreddit', 'historias')
const botSubreddit = argument('bot-subreddit')
const output = argument('output', 'historias.json')
if (!term || !botSubreddit) {
  console.error('Uso: node automation/search.mjs --bot-subreddit NOME --term "termo" [--subreddit historias] [--output historias.json]')
  process.exit(2)
}

const headed = process.argv.includes('--headed')
const executablePath = process.env.BROWSER_PATH || '/usr/bin/google-chrome'
const browser = await chromium.launchPersistentContext('.automation-profile', {headless: !headed, executablePath})
const page = await browser.newPage()
try {
  await page.goto(`https://www.reddit.com/r/${botSubreddit}/`, {waitUntil: 'domcontentloaded', timeout: 60000})
  const botPost = page.locator('a[href*="/comments/"]').filter({hasText: /mybothistoriador|historiador/i}).first()
  await botPost.waitFor({state: 'visible', timeout: 60000})
  await botPost.click()
  await page.waitForLoadState('domcontentloaded')
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
