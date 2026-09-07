#!/usr/bin/env node
import fs from 'node:fs/promises'
import process from 'node:process'
import readline from 'node:readline/promises'
import { stdin as input, stdout as stdout } from 'node:process'
import { chromium } from 'playwright'

function argument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : fallback
}

const term = argument('term')
const subreddit = argument('subreddit', 'historias')
const botSubreddit = argument('bot-subreddit')
const output = argument('output', 'historias.json')
const limit = argument('limit', '10')
if (!term || !botSubreddit) {
  console.error('Uso: node automation/search.mjs --bot-subreddit NOME --term "termo" [--subreddit historias] [--output historias.json]')
  process.exit(2)
}

const headed = !process.argv.includes('--headless')
const launchOptions = {headless: !headed}
if (process.env.BROWSER_PATH) launchOptions.executablePath = process.env.BROWSER_PATH
const browser = await chromium.launchPersistentContext('.automation-profile', launchOptions)
const page = await browser.newPage()
async function findFrameWith(selector, timeout = 60000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    for (const currentPage of browser.pages()) {
      for (const frame of currentPage.frames()) {
        const locator = frame.locator(selector)
        if (await locator.count().catch(() => 0) && await locator.first().isVisible().catch(() => false)) return frame
      }
    }
    await page.waitForTimeout(500)
  }
  throw new Error(`Não encontrei ${selector} no post do Devvit.`)
}
try {
  await page.goto(`https://www.reddit.com/r/${botSubreddit}/`, {waitUntil: 'domcontentloaded', timeout: 60000})
  if (headed && page.url().includes('logging_in=true')) {
    console.log('Conclua o login do Reddit na janela aberta e volte ao terminal.')
    const rl = readline.createInterface({input, output: stdout})
    await rl.question('Pressione Enter depois que o login terminar: ')
    rl.close()
    await page.goto(`https://www.reddit.com/r/${botSubreddit}/`, {waitUntil: 'domcontentloaded', timeout: 60000})
  }
  const botPost = page.locator('a[href*="/comments/"][href*="mybothistoriador"]').first()
  await botPost.waitFor({state: 'visible', timeout: 60000})
  const botPostUrl = await botPost.getAttribute('href')
  if (!botPostUrl) throw new Error('O post do bot foi encontrado, mas não possui URL.')
  await page.goto(new URL(botPostUrl, page.url()).toString(), {waitUntil: 'domcontentloaded', timeout: 60000})
  await page.waitForLoadState('domcontentloaded')
  const splashFrame = await findFrameWith('#start-btn')
  await splashFrame.locator('#start-btn').click()
  const appFrame = await findFrameWith('#search-form')
  await appFrame.locator('#search-input').fill(term)
  await appFrame.locator('#subreddit-select').selectOption(subreddit)
  const limitInput = appFrame.locator('#story-limit')
  if (await limitInput.count()) await limitInput.fill(String(limit))
  await appFrame.locator('#search-form button[type="submit"]').click()
  await appFrame.locator('#result-count').waitFor({state: 'visible', timeout: 60000})
  await appFrame.waitForFunction(() => !document.querySelector('#result-count')?.textContent?.includes('pesquisando'))
  const stories = await appFrame.locator('.story-card').evaluateAll(cards => cards.map(card => ({
    subreddit: card.querySelector('.card-meta span')?.textContent?.trim() || '',
    title: card.querySelector('h3')?.textContent?.trim() || '',
    excerpt: card.querySelector('p')?.textContent?.trim() || '',
    text: card.querySelector('.full-text')?.textContent?.trim() || card.querySelector('p')?.textContent?.trim() || '',
    author: card.querySelector('.author')?.textContent?.trim() || '',
    url: card.querySelector('.author')?.getAttribute('href') || '',
  })))
  if (!stories.length) {
    const status = await appFrame.locator('#result-count').textContent().catch(() => '')
    const message = await appFrame.locator('.empty-state').textContent().catch(() => '')
    console.log(`Nenhum card retornado. status="${status?.trim() || ''}" mensagem="${message?.trim() || ''}"`)
  }
  const result = {term, subreddit: `r/${subreddit}`, collectedAt: new Date().toISOString(), stories}
  await fs.writeFile(output, `${JSON.stringify(result, null, 2)}\n`)
  console.log(`Pesquisa concluída: ${stories.length} história(s) salvas em ${output}`)
} finally {
  await browser.close()
}
