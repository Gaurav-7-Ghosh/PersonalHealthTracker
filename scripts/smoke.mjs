// Click-through smoke test at iPhone size against the production build.
// Usage: npm run build && npm run smoke   (needs a Chromium for Playwright)
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const PORT = 4179
const shots = process.env.SHOTS ?? 'screenshots'
mkdirSync(shots, { recursive: true })

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 2500))

const errors = []
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {})
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark', hasTouch: true })
const page = await ctx.newPage()
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && !m.text().startsWith('Failed to load resource') && errors.push(m.text()))

const shot = (n) => page.screenshot({ path: `${shots}/${n}.png` })
const step = async (name, fn) => {
  try {
    await fn()
    console.log('ok  ', name)
  } catch (e) {
    console.log('FAIL', name, e.message.split('\n')[0])
    errors.push(name)
    await shot('fail-' + name.replace(/\W+/g, '-'))
  }
}

try {
  await page.goto(`http://localhost:${PORT}/`)
  await step('today loads', async () => {
    await page.getByRole('heading', { name: 'Today' }).waitFor()
    await shot('01-today')
  })

  await step('library filters', async () => {
    await page.getByRole('navigation').getByRole('button', { name: 'Library' }).click()
    await page.getByRole('tab', { name: 'Mobility' }).click()
    await page.getByRole('button', { name: 'Chest', exact: true }).click()
    await page.getByText('Serratus wall slide').waitFor()
    await shot('02-library')
  })

  await step('entry page with form card', async () => {
    await page.getByText('Serratus wall slide').click()
    await page.getByRole('heading', { name: 'Serratus wall slide' }).waitFor()
    await shot('03-entry')
  })

  await step('edit entry: add link and note', async () => {
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByRole('button', { name: 'Add link' }).click()
    await page.getByLabel('Link').fill('https://www.youtube.com/watch?v=example')
    await page.getByLabel('Title').fill('Serratus wall slide, form breakdown')
    await page.getByRole('button', { name: 'Add note' }).click()
    await page.getByLabel('Note').fill('Do not shrug at the top.')
    await shot('04-edit')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.getByText('Serratus wall slide, form breakdown').waitFor()
    await page.getByText('Do not shrug at the top.').waitFor()
  })

  await step('capture a link to an entry', async () => {
    await page.getByRole('navigation').getByRole('button', { name: 'Today' }).click()
    await page.getByRole('button', { name: 'Save a link' }).click()
    await page.getByLabel('Link').fill('https://www.instagram.com/reel/abc123/')
    await page.getByLabel('Title').fill('Bench press arch setup')
    await page.getByRole('button', { name: 'Barbell bench press' }).first().click()
    await shot('05-capture')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.getByText('Saved to Barbell bench press').waitFor()
  })

  await step('session: log sets, swap, finish', async () => {
    await page.getByRole('navigation').getByRole('button', { name: 'Today' }).click()
    await page.locator('.routine-card', { hasText: 'Chest and back' }).getByRole('button', { name: 'Start' }).click()
    await page.getByRole('heading', { name: 'Barbell bench press' }).waitFor()
    await page.getByRole('button', { name: 'Increase Weight' }).click()
    await page.locator('#st-weight').fill('60')
    await page.getByRole('button', { name: 'Log set 1' }).click()
    await page.getByRole('button', { name: 'Log set 2' }).click()
    await shot('06-session')
    await page.getByRole('button', { name: /Busy\? Swap/ }).click()
    await page.getByRole('button', { name: 'Bench busy' }).click()
    await shot('07-swap')
    await page.getByRole('dialog').getByRole('button', { name: /Machine chest press/ }).click()
    await page.getByRole('heading', { name: 'Machine chest press' }).waitFor()
    await page.getByRole('button', { name: 'Log set 1' }).click()
    await page.getByRole('button', { name: 'Finish' }).click()
    await page.getByRole('button', { name: 'Save and finish' }).click()
    await page.getByText('Swapped from Barbell bench press').waitFor()
    await shot('08-summary')
  })

  await step('history shows previous sets', async () => {
    await page.getByRole('navigation').getByRole('button', { name: 'Library' }).click()
    await page.getByRole('tab', { name: 'All' }).click()
    await page.getByRole('button', { name: 'Chest', exact: true }).click()
    await page.getByLabel('Search library').fill('bench press')
    await page.getByText('Barbell bench press').first().click()
    await page.getByText('60 kg × 8').first().waitFor()
    await shot('09-entry-history')
  })

  await step('hiit timer runs', async () => {
    await page.getByRole('navigation').getByRole('button', { name: 'Today' }).click()
    await page.getByRole('button', { name: 'Home HIIT' }).click()
    await shot('10-hiit-setup')
    await page.getByRole('button', { name: 'Start' }).click()
    await page.getByText('Get ready').waitFor()
    await page.waitForTimeout(1500)
    await shot('11-hiit-player')
    await page.getByRole('button', { name: 'Skip' }).click()
    await page.getByText('Work', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'End' }).click()
  })

  await step('settings and light theme', async () => {
    await page.getByRole('navigation').getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('heading', { name: 'Backup' }).waitFor()
    await page.emulateMedia({ colorScheme: 'light' })
    await shot('12-settings-light')
    await page.emulateMedia({ colorScheme: 'dark' })
  })

  await step('data survives reload', async () => {
    await page.reload()
    await page.getByRole('navigation').getByRole('button', { name: 'History' }).click()
    await page.getByText('Chest and back').first().waitFor()
  })

  await step('no horizontal scroll', async () => {
    const w = await page.evaluate(() => document.documentElement.scrollWidth)
    if (w > 390) throw new Error('page is ' + w + 'px wide')
  })
} finally {
  await browser.close()
  server.kill()
}

if (errors.length) {
  console.log('\nErrors:\n' + errors.join('\n'))
  process.exit(1)
}
console.log('\nAll steps passed')
