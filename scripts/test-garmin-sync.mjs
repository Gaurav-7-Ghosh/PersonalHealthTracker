// Runs scripts/garmin_sync.py against the fake Supabase with canned Garmin responses (no internet, no Garmin
// account) and checks the wellness rows it writes, including merging into a day imported earlier.
// Usage: npm run test:garmin-sync   (needs python3)
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startFakeSupabase } from './fake-supabase.mjs'

const PORT = 4181
const fake = startFakeSupabase(PORT)
const iso = (d) => d.toISOString().slice(0, 10)
const today = iso(new Date())
const yesterday = iso(new Date(Date.now() - 86_400_000))
const uid = 'u-me@example.com'
const fail = (msg) => {
  console.log('FAIL', msg)
  fake.server.close()
  process.exit(1)
}

// Yesterday was imported from an export earlier: its distance and sleep stages must survive.
fake.rows.set(`${uid}/wellness/${yesterday}`, {
  user_id: uid,
  store: 'wellness',
  id: yesterday,
  data: { day: yesterday, steps: 100, distanceM: 4200, sleep: { score: 70, deep: 3600 }, source: 'garmin', updatedAt: 1 },
  deleted: false,
  modified: 1,
  synced_at: '2026-01-01T00:00:00.000Z',
})

const dir = mkdtempSync(join(tmpdir(), 'garmin-sync-'))
const responses = join(dir, 'garmin.json')
writeFileSync(
  responses,
  JSON.stringify({
    summary: {
      [yesterday]: { totalSteps: 9050, dailyStepGoal: 8000, totalKilocalories: 2512.0, activeKilocalories: 702.0, bmrKilocalories: 1810.0, restingHeartRate: 57 },
      [today]: { totalSteps: null, totalKilocalories: null }, // not synced from the watch yet
    },
    sleep: {
      [yesterday]: { dailySleepDTO: { calendarDate: yesterday, sleepStartTimestampGMT: 1764000000000, sleepEndTimestampGMT: 1764027000000, lightSleepSeconds: 14000, remSleepSeconds: 5000, sleepScores: { overall: { value: 84, qualifierKey: 'GOOD' } } } },
      [today]: { dailySleepDTO: { calendarDate: today, sleepScores: { overall: { value: 77 } }, deepSleepSeconds: 4000 } },
    },
  }),
)

// Async: the fake server runs in this process, so a blocking spawn would never get an answer.
const run = (extraEnv) =>
  new Promise((resolve) => {
    const p = spawn('python3', ['-I', 'scripts/garmin_sync.py', '--days', '2', '--fake', responses], {
      env: { PATH: process.env.PATH, GARMIN_TZ: 'UTC', SUPABASE_URL: `http://localhost:${PORT}`, SUPABASE_KEY: 'sb_publishable_test', SUPABASE_EMAIL: 'me@example.com', SUPABASE_PASSWORD: 'secret-pass', ...extraEnv },
    })
    let stdout = ''
    let stderr = ''
    p.stdout.on('data', (d) => (stdout += d))
    p.stderr.on('data', (d) => (stderr += d))
    p.on('close', (status) => resolve({ status, stdout, stderr }))
  })

const out = await run({})
process.stdout.write(out.stdout + out.stderr)
if (out.status !== 0) fail('script exited ' + out.status)

const y = fake.rows.get(`${uid}/wellness/${yesterday}`)?.data
const t = fake.rows.get(`${uid}/wellness/${today}`)?.data
if (!y || y.steps !== 9050 || y.kcalTotal !== 2512 || y.kcalActive !== 702 || y.stepGoal !== 8000) fail('yesterday summary: ' + JSON.stringify(y))
if (y.distanceM !== 4200) fail('yesterday lost the imported distance')
if (y.sleep?.score !== 84 || y.sleep?.deep !== 3600 || y.sleep?.light !== 14000 || y.sleep?.start !== 1764000000000) fail('yesterday sleep: ' + JSON.stringify(y.sleep))
if (!t || t.steps !== undefined || t.sleep?.score !== 77) fail('today: ' + JSON.stringify(t))
if (t.source !== 'garmin' || t.day !== today) fail('today shape: ' + JSON.stringify(t))
if (/9050|2512|84\b/.test(out.stdout)) fail('values were printed to the log')

// Not set up: skips quietly with success.
const skip = await run({ SUPABASE_PASSWORD: '' })
if (skip.status !== 0 || !skip.stdout.includes('not set up')) fail('missing secrets should skip: ' + skip.stdout + skip.stderr)

fake.server.close()
console.log('\nGarmin sync test passed')
