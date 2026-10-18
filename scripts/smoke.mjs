// Click-through smoke test at iPhone size against the production build.
// Usage: npm run build && npm run smoke   (needs a Chromium for Playwright)
import { spawn } from 'node:child_process'
import { mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { startFakeSupabase } from './fake-supabase.mjs'

const PORT = 4179
const shots = process.env.SHOTS ?? 'screenshots'
mkdirSync(shots, { recursive: true })

const fake = startFakeSupabase(4180)
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 2500))

const errors = []
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {})
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark', hasTouch: true })
const page = await ctx.newPage()
// No internet in the test: answer YouTube thumbnail requests with a tiny grey PNG.
const GREY = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
await ctx.route('https://i.ytimg.com/**', (r) => r.fulfill({ status: 200, contentType: 'image/png', body: GREY }))
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && !m.text().startsWith('Failed to load resource') && errors.push(m.text()))

const shot = (n) => page.screenshot({ path: `${shots}/${n}.png` })
const step = async (name, fn) => {
  try {
    await fn()
    console.log('ok  ', name)
  } catch (e) {
    console.log('FAIL', name, e.message.split('\n').slice(0, 3).join(' | '))
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
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await page.getByRole('button', { name: 'Add link' }).click()
    await page.getByLabel('Link', { exact: true }).fill('https://www.youtube.com/watch?v=example')
    await page.getByLabel('Title').fill('Serratus wall slide, form breakdown')
    await page.getByRole('button', { name: 'Add note' }).click()
    await page.getByLabel('Note').fill('Do not shrug at the top.')
    await shot('04-edit')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.getByText('Serratus wall slide, form breakdown').waitFor()
    await page.getByText('Do not shrug at the top.').waitFor()
    // YouTube thumbnails come from the video id, even with no network.
    await page.locator('img.link-thumb[src="https://i.ytimg.com/vi/example/hqdefault.jpg"]').waitFor()
  })

  await step('cover image for an Instagram link', async () => {
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await page.getByRole('button', { name: 'Add link' }).click()
    await page.getByLabel('Link', { exact: true }).last().fill('https://www.instagram.com/reel/abc123/')
    await page.getByLabel('Title').last().fill('Wall slide cue reel')
    const png = await page.evaluate(() => {
      const c = document.createElement('canvas')
      c.width = 320
      c.height = 180
      const g = c.getContext('2d')
      g.fillStyle = '#c4f36a'
      g.fillRect(0, 0, 320, 180)
      return c.toDataURL('image/png').split(',')[1]
    })
    await page.getByLabel('Cover image for link 2').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') })
    await page.getByRole('button', { name: 'Remove cover' }).waitFor()
    await page.getByRole('button', { name: 'Save' }).click()
    await page.getByText('Wall slide cue reel').waitFor()
    const thumbs = await page.locator('a.link-row img.link-thumb').count()
    if (thumbs < 2) throw new Error('expected a thumbnail on both links, got ' + thumbs)
    await shot('04b-links')
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

  await step('start workout: body map to exercise list', async () => {
    await page.getByRole('navigation').getByRole('button', { name: 'Today' }).click()
    await page.getByRole('button', { name: /Start workout/ }).click()
    await shot('06-body-front')
    await page.locator('g.zone[data-muscle="Upper chest"] path').last().click()
    await page.getByRole('heading', { name: 'Upper chest' }).waitFor()
    await page.getByRole('button', { name: 'Back', exact: true }).first().click()
    await page.getByRole('button', { name: /^Legs \d/ }).click()
    await page.locator('svg[aria-label="Back of the body"] g.zone[data-muscle="Hamstrings"]').waitFor()
    await shot('07-region')
    await page.getByRole('button', { name: 'Back', exact: true }).first().click()
    await page.getByRole('button', { name: /^Chest \d/ }).click()
    await page.getByRole('button', { name: /^Upper chest \d/ }).click()
    await page.getByRole('button', { name: 'Bench', exact: true }).click()
    await shot('08-exercises')
  })

  await step('create own exercise from the list', async () => {
    await page.getByRole('button', { name: 'New' }).click()
    await page.getByLabel('Name').fill('Incline Smith squeeze press')
    await page.getByRole('button', { name: 'Add cue' }).click()
    await page.getByLabel('Cue 1', { exact: true }).fill('Squeeze dumbbells together the whole rep')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.getByRole('heading', { name: 'Upper chest' }).waitFor()
    await page.getByText('Incline Smith squeeze press').waitFor()
  })

  await step('session: log sets, swap, finish', async () => {
    await page.getByRole('button', { name: 'Start with Incline barbell bench press' }).click()
    await page.getByRole('heading', { name: 'Incline barbell bench press' }).waitFor()
    await page.locator('#st-weight').click()
    await page.keyboard.type('62.5')
    await page.keyboard.press('Enter')
    if ((await page.locator('#st-weight').inputValue()) !== '62.5') throw new Error('typed weight did not stick')
    await page.getByRole('button', { name: 'Log set 1' }).click()
    await page.getByText('62.5×10').waitFor()
    await page.locator('#st-weight').fill('60')
    await page.getByRole('button', { name: 'Log set 2' }).click()
    await shot('09-session')
    await page.getByRole('button', { name: /Busy\? Swap/ }).click()
    await page.getByRole('button', { name: 'Bench busy' }).click()
    await shot('10-swap')
    await page.getByRole('dialog').getByRole('button', { name: /Low-to-high cable fly/ }).click()
    await page.getByRole('heading', { name: 'Low-to-high cable fly' }).waitFor()
    await page.getByRole('button', { name: 'Log set 1' }).click()
    await page.getByRole('button', { name: 'Add exercise' }).click()
    await page.getByRole('tab', { name: 'Back' }).click()
    await shot('11-body-back')
    await page.locator('g.zone[data-muscle="Lats"] path').first().click()
    await page.getByRole('heading', { name: 'Lats' }).waitFor()
    await page.getByRole('button', { name: 'Add Lat pulldown' }).click()
    await page.getByRole('heading', { name: 'Lat pulldown' }).waitFor()
    await page.getByRole('button', { name: 'Log set 1' }).click()
    await page.getByRole('button', { name: 'Finish' }).click()
    await page.getByRole('button', { name: 'Save and finish' }).click()
    await page.getByText('Swapped from Incline barbell bench press').waitFor()
    await page.getByText('Chest + Back').first().waitFor()
    await shot('12-summary')
  })

  await step('form card editor: screenshots, drawing, crop, notes', async () => {
    await page.getByRole('navigation').getByRole('button', { name: 'Library' }).click()
    await page.getByRole('tab', { name: 'All' }).click()
    const chest = page.getByRole('button', { name: 'Chest', exact: true })
    if ((await chest.getAttribute('aria-pressed')) === 'true') await chest.click()
    await page.getByLabel('Search library').fill('bent-over row')
    await page.getByText('Barbell bent-over row').first().click()
    await page.getByRole('button', { name: 'Edit form card' }).click()
    await page.getByRole('heading', { name: 'Form card' }).waitFor()
    // FORM_SHOTS=folder of real screenshots; otherwise draw stand-ins in the browser.
    const dir = process.env.FORM_SHOTS
    const files = dir
      ? readdirSync(dir).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort().map((f) => join(dir, f))
      : await page.evaluate(() =>
          [[420, 540], [880, 330], [930, 340]].map(([w, h], i) => {
            const c = document.createElement('canvas')
            c.width = w
            c.height = h
            const g = c.getContext('2d')
            g.fillStyle = ['#345', '#543', '#354'][i]
            g.fillRect(0, 0, w, h)
            return { name: `shot${i}.png`, mimeType: 'image/png', buffer: c.toDataURL('image/png').split(',')[1] }
          }),
        ).then((list) => list.map((f) => ({ ...f, buffer: Buffer.from(f.buffer, 'base64') })))
    await page.locator('#fc-photos').setInputFiles(files)
    await page.getByLabel('Notes for photo 3').waitFor()
    await page.getByLabel('Position of photo 2').selectOption('setup')
    await page.getByLabel('Notes for photo 2').fill('Neutral back\nPush the hips back')
    await page.getByLabel('Heading for photo 2').fill('Back angle from the side')

    // Draw an arrow and a typed note on the first photo.
    await page.getByRole('listitem', { name: /Photo 1/ }).getByRole('button', { name: 'Draw' }).click()
    const canvas = page.getByTestId('ink-canvas')
    await canvas.waitFor()
    const b = await canvas.boundingBox()
    await page.getByRole('tab', { name: 'Arrow' }).click()
    await page.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.85)
    await page.mouse.down()
    await page.mouse.move(b.x + b.width * 0.2, b.y + b.height * 0.92, { steps: 5 })
    await page.mouse.up()
    await page.getByRole('tab', { name: 'Text' }).click()
    await page.mouse.click(b.x + b.width * 0.25, b.y + b.height * 0.75)
    await page.getByLabel('Note text').fill('Feet slightly out')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await shot('17-ink-editor')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.getByRole('button', { name: 'Edit drawing' }).waitFor()

    // Crop the slide text off the third screenshot.
    await page.getByRole('listitem', { name: /Photo 3/ }).getByRole('button', { name: 'Crop' }).click()
    const crop = page.getByTestId('crop-canvas')
    await crop.waitFor()
    const c = await crop.boundingBox()
    await page.mouse.move(c.x + c.width * 0.29, c.y + 2)
    await page.mouse.down()
    await page.mouse.move(c.x + c.width - 2, c.y + c.height - 2, { steps: 5 })
    await page.mouse.up()
    await page.getByRole('button', { name: 'Apply' }).click()
    await page.getByText('Cropped').waitFor()
    await shot('18-form-edit')

    await page.getByRole('button', { name: 'Done' }).click()
    await page.getByRole('tab', { name: 'Setup 2' }).click()
    await page.getByText('Push the hips back').waitFor()
    await page.getByRole('heading', { name: 'Back angle from the side' }).waitFor()
    await shot('19b-heading')
    await page.getByRole('tab', { name: 'Setup 1' }).click()
    await shot('19-form-card')
    await page.getByRole('button', { name: /Open full screen/ }).click()
    await page.getByRole('dialog').locator('text=Feet slightly out').waitFor()
    await shot('20-lightbox')
    await page.getByRole('button', { name: 'Close' }).click()
  })

  await step('history shows previous sets', async () => {
    await page.getByRole('navigation').getByRole('button', { name: 'Library' }).click()
    await page.getByRole('tab', { name: 'All' }).click()
    await page.getByLabel('Search library').fill('incline barbell')
    await page.getByText('Incline barbell bench press').first().click()
    await page.getByText('60 kg × 10').first().waitFor()
    await shot('13-entry-history')
  })

  await step('rename an exercise and see last time in a session', async () => {
    await page.getByRole('button', { name: 'Rename' }).click()
    await page.locator('#rename').fill('Incline bench 30 degrees')
    await page.getByRole('button', { name: 'Save name' }).click()
    await page.getByRole('heading', { name: 'Incline bench 30 degrees' }).waitFor()
    await page.getByRole('button', { name: 'Log now' }).click()
    await page.getByRole('heading', { name: 'Incline bench 30 degrees' }).waitFor()
    const card = page.getByRole('region', { name: 'Last time' })
    await card.getByText('62.5 kg × 10').waitFor()
    await page.locator('#st-weight').fill('40')
    await card.getByRole('button', { name: /Use set 1 from last time/ }).click()
    if ((await page.locator('#st-weight').inputValue()) !== '62.5') throw new Error('last-time set did not fill the weight')
    await shot('13b-last-time')
    await page.getByRole('button', { name: 'Finish' }).click()
    await page.getByRole('button', { name: 'Discard session' }).click()
  })

  await step('bookmark a mobility drill and find it by section', async () => {
    await page.getByRole('navigation').getByRole('button', { name: 'Library' }).click()
    await page.getByRole('tab', { name: 'All' }).click()
    await page.getByLabel('Search library').fill('open-book')
    await page.getByText('Open-book thoracic rotation').first().click()
    await page.getByRole('button', { name: 'Bookmark', exact: true }).click()
    await page.getByText('Bookmarked in Mobility').waitFor()
    // The same tap opens "Save to", where it can also go into a named list.
    const sheet = page.getByRole('dialog', { name: 'Save to' })
    await sheet.getByLabel('New list name').fill('Morning mobility')
    await sheet.getByRole('button', { name: 'Add', exact: true }).click()
    await sheet.getByRole('button', { name: /Morning mobility/, pressed: true }).waitFor()
    await shot('21-save-to')
    await sheet.getByRole('button', { name: 'Done' }).click()
    await page.getByRole('button', { name: /^Saved/ }).waitFor()
    await page.getByRole('navigation').getByRole('button', { name: 'Today' }).click()
    await page.getByRole('button', { name: /Bookmarks/ }).click()
    await page.getByRole('heading', { name: 'Bookmarks', level: 1 }).waitFor()
    await page.getByRole('region', { name: 'Mobility' }).getByText('Open-book thoracic rotation').waitFor()
    await shot('22-bookmarks')
    await page.getByRole('region', { name: 'Your lists' }).getByRole('button', { name: /Morning mobility 1 exercise/ }).click()
    await page.getByRole('heading', { name: 'Morning mobility', level: 1 }).waitFor()
    await page.getByText('Open-book thoracic rotation').waitFor()
    await shot('23-list')
    await page.getByRole('navigation').getByRole('button', { name: 'Library' }).click()
    await page.getByLabel('Search library').fill('')
    await page.getByRole('button', { name: 'Bookmarked only' }).click()
    await page.getByText('1 entry').waitFor()
    await page.getByRole('button', { name: 'Bookmarked only' }).click()
    await page.getByRole('button', { name: 'Morning mobility', exact: true }).click()
    await page.getByText('1 entry').waitFor()
    await page.getByRole('button', { name: 'Morning mobility', exact: true }).click()
  })

  await step('hiit timer runs', async () => {
    await page.getByRole('navigation').getByRole('button', { name: 'Today' }).click()
    await page.getByRole('button', { name: 'Home HIIT' }).click()
    await shot('14-hiit-setup')
    await page.getByRole('button', { name: /Burpee/ }).click()
    await page.getByRole('button', { name: /Squat jumps/ }).click()
    await page.getByRole('button', { name: 'Start' }).click()
    await page.getByText('Get ready').waitFor()
    await page.waitForTimeout(1500)
    await shot('15-hiit-player')
    await page.getByRole('button', { name: 'Skip' }).click()
    await page.getByText('Work', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'End' }).click()
  })

  await step('settings and light theme', async () => {
    await page.getByRole('navigation').getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('heading', { name: 'Backup' }).waitFor()
    await page.emulateMedia({ colorScheme: 'light' })
    await shot('16-settings-light')
    await page.emulateMedia({ colorScheme: 'dark' })
  })

  await step('sync between two devices', async () => {
    const signIn = async (p, password = 'secret-pass') => {
      await p.getByRole('navigation').getByRole('button', { name: 'Settings' }).click()
      const box = p.getByRole('region', { name: 'Sync' })
      await box.getByLabel('Supabase project URL').fill('http://localhost:4180')
      await box.getByLabel('Publishable key').fill('sb_publishable_test')
      await box.getByLabel('Email').fill('me@example.com')
      await box.getByLabel('Password').fill(password)
      await box.getByRole('button', { name: 'Sign in and sync' }).click()
      return box
    }
    // Mac: sends everything it has.
    const mac = await signIn(page)
    await mac.getByText(/Last synced/).waitFor()
    await shot('24-sync-signed-in')
    if (!fake.objects.size) throw new Error('no photos uploaded')

    // Phone: a fresh device signs in and gets it all, photos included.
    const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark', hasTouch: true })
    await ctx2.route('https://i.ytimg.com/**', (r) => r.fulfill({ status: 200, contentType: 'image/png', body: GREY }))
    const phone = await ctx2.newPage()
    phone.on('pageerror', (e) => errors.push('phone: ' + e.message))
    await phone.goto(`http://localhost:${PORT}/`)
    let box = await signIn(phone, 'wrong')
    await box.getByText('Invalid login credentials').waitFor()
    await box.getByLabel('Password').fill('secret-pass')
    await box.getByRole('button', { name: 'Sign in and sync' }).click()
    await box.getByText(/Last synced/).waitFor()
    await shot('25-sync-sign-in')
    await phone.getByRole('navigation').getByRole('button', { name: 'History' }).click()
    await phone.getByText('Chest + Back').first().waitFor()
    await phone.getByRole('navigation').getByRole('button', { name: 'Today' }).click()
    await phone.getByRole('button', { name: /Bookmarks/ }).click()
    await phone.getByRole('region', { name: 'Your lists' }).getByRole('button', { name: /Morning mobility 1 exercise/ }).waitFor()
    await phone.getByRole('navigation').getByRole('button', { name: 'Library' }).click()
    await phone.getByLabel('Search library').fill('incline bench 30')
    await phone.getByText('Incline bench 30 degrees').first().waitFor()
    await phone.getByLabel('Search library').fill('bent-over row')
    await phone.getByText('Barbell bent-over row').first().click()
    await phone.getByRole('tab', { name: 'Setup 2' }).click()
    await phone.getByRole('heading', { name: 'Back angle from the side' }).waitFor()
    await phone.locator('.inkwrap img').first().waitFor()
    await phone.screenshot({ path: `${shots}/26-sync-phone-form-card.png` })

    // A change on the phone reaches the Mac.
    await phone.getByRole('button', { name: 'Rename' }).click()
    await phone.locator('#rename').fill('Bent-over row, overhand')
    await phone.getByRole('button', { name: 'Save name' }).click()
    await phone.getByRole('navigation').getByRole('button', { name: 'Settings' }).click()
    box = phone.getByRole('region', { name: 'Sync' })
    fake.expireTokens() // the phone's token is refused once and refreshed
    await box.getByRole('button', { name: 'Sync now' }).click()
    await phone.waitForFunction(() => !document.body.innerText.includes('waiting to send'))
    await page.getByRole('region', { name: 'Sync' }).getByRole('button', { name: 'Sync now' }).click()
    await page.getByRole('navigation').getByRole('button', { name: 'Library' }).click()
    await page.getByLabel('Search library').fill('overhand')
    await page.getByText('Bent-over row, overhand').first().waitFor({ timeout: 8000 })
    await page.getByLabel('Search library').fill('')
    await ctx2.close()
  })

  await step('data survives reload', async () => {
    await page.reload()
    await page.getByRole('navigation').getByRole('button', { name: 'History' }).click()
    await page.getByText('Chest + Back').first().waitFor()
  })

  await step('no horizontal scroll', async () => {
    const w = await page.evaluate(() => document.documentElement.scrollWidth)
    if (w > 390) throw new Error('page is ' + w + 'px wide')
  })
} finally {
  await browser.close()
  server.kill()
  fake.server.close()
}

if (errors.length) {
  console.log('\nErrors:\n' + errors.join('\n'))
  process.exit(1)
}
console.log('\nAll steps passed')
