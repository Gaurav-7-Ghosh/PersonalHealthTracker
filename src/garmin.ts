// Reads Garmin Connect's "Export your data" archive on the device: daily steps and calories burnt from the
// daily summaries (UDSFile_*.json) and sleep with its score from *_sleepData.json. Nothing is uploaded.
//
// Why an export and not a live connection: Garmin's Health API needs an approved business application and a
// server, and Garmin's sign-in can't be called from a web page. The export is free and has every day.
//
// The archive is read in pieces (File.slice), so a large export with years of activity files doesn't have to
// fit in memory; only the small JSON summaries are inflated. Field names vary between export versions, so the
// parser looks for the known names and ignores anything else.
import type { DayStats, SleepStats } from './types'

export interface ImportResult {
  days: Map<string, Partial<DayStats>>
  /** Files that held days, for the summary line. */
  files: number
}

// ---------- zip ----------

interface ZipEntry {
  name: string
  method: number
  compressed: number
  offset: number
}

const u16 = (v: DataView, o: number) => v.getUint16(o, true)
const u32 = (v: DataView, o: number) => v.getUint32(o, true)
const u64 = (v: DataView, o: number) => Number(v.getBigUint64(o, true))

async function bytes(file: Blob, start: number, end: number): Promise<DataView> {
  return new DataView(await file.slice(start, end).arrayBuffer())
}

/** Lists a zip's files from its central directory (zip64 included). */
export async function listZip(file: Blob): Promise<ZipEntry[]> {
  const tailLen = Math.min(file.size, 65_557 + 20)
  const tail = await bytes(file, file.size - tailLen, file.size)
  let eocd = -1
  for (let i = tail.byteLength - 22; i >= 0; i--)
    if (u32(tail, i) === 0x06054b50) {
      eocd = i
      break
    }
  if (eocd < 0) throw new Error('not a zip')
  let count = u16(tail, eocd + 10)
  let size = u32(tail, eocd + 12)
  let start = u32(tail, eocd + 16)
  // Zip64: the locator sits just before the end record and points at the zip64 end record.
  if ((start === 0xffffffff || count === 0xffff) && eocd >= 20 && u32(tail, eocd - 20) === 0x07064b50) {
    const at = u64(tail, eocd - 12)
    const z = await bytes(file, at, at + 56)
    if (u32(z, 0) === 0x06064b50) {
      count = u64(z, 32)
      size = u64(z, 40)
      start = u64(z, 48)
    }
  }
  const dir = await bytes(file, start, start + size)
  const dec = new TextDecoder()
  const out: ZipEntry[] = []
  let p = 0
  for (let n = 0; n < count && p + 46 <= dir.byteLength; n++) {
    if (u32(dir, p) !== 0x02014b50) break
    const method = u16(dir, p + 10)
    let compressed = u32(dir, p + 20)
    let uncompressed = u32(dir, p + 24)
    const nameLen = u16(dir, p + 28)
    const extraLen = u16(dir, p + 30)
    const commentLen = u16(dir, p + 32)
    let offset = u32(dir, p + 42)
    const name = dec.decode(new Uint8Array(dir.buffer, dir.byteOffset + p + 46, nameLen))
    // Zip64 extra field holds the real sizes and offset when the 32-bit ones are maxed out.
    let e = p + 46 + nameLen
    const eEnd = e + extraLen
    while (e + 4 <= eEnd) {
      const id = u16(dir, e)
      const len = u16(dir, e + 2)
      if (id === 0x0001) {
        let q = e + 4
        if (uncompressed === 0xffffffff) (uncompressed = u64(dir, q)), (q += 8)
        if (compressed === 0xffffffff) (compressed = u64(dir, q)), (q += 8)
        if (offset === 0xffffffff) offset = u64(dir, q)
      }
      e += 4 + len
    }
    out.push({ name, method, compressed, offset })
    p = eEnd + commentLen
  }
  return out
}

/** The bytes of one file in the zip, inflated. */
export async function readZipEntry(file: Blob, e: ZipEntry): Promise<Blob> {
  const head = await bytes(file, e.offset, e.offset + 30)
  if (u32(head, 0) !== 0x04034b50) throw new Error('bad zip entry')
  const dataAt = e.offset + 30 + u16(head, 26) + u16(head, 28)
  const raw = file.slice(dataAt, dataAt + e.compressed)
  if (e.method === 0) return raw
  if (e.method !== 8) throw new Error('unsupported compression')
  const stream = raw.stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Response(stream).blob()
}

// ---------- parsing ----------

type Obj = Record<string, unknown>
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(+v) ? +v : undefined)

/** calendarDate is "2024-05-01" in newer exports and { date: "May 1, 2024 ..." } in some older ones. */
function dayOf(v: unknown): string | undefined {
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4}-\d{2}-\d{2})/)
    if (m) return m[1]
    const d = new Date(v)
    return isNaN(+d) ? undefined : localDay(d)
  }
  if (v && typeof v === 'object') return dayOf((v as Obj).date)
  return undefined
}
const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Garmin GMT timestamps come as "2024-05-01T22:10:00.0" (no zone), as ms numbers, or as { date }. */
function time(v: unknown): number | undefined {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const t = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : v.replace(' ', 'T') + 'Z')
    return isNaN(t) ? undefined : t
  }
  if (v && typeof v === 'object') return time((v as Obj).date)
  return undefined
}

/** One daily summary (UDS) record: steps and calories. */
export function parseDaily(o: Obj): Partial<DayStats> | undefined {
  const day = dayOf(o.calendarDate)
  if (!day) return undefined
  const d: Partial<DayStats> = { day }
  const steps = num(o.totalSteps)
  if (steps !== undefined) d.steps = steps
  const goal = num(o.dailyStepGoal)
  if (goal) d.stepGoal = goal
  const total = num(o.totalKilocalories)
  const active = num(o.activeKilocalories)
  const resting = num(o.bmrKilocalories)
  if (total !== undefined) d.kcalTotal = total
  else if (active !== undefined && resting !== undefined) d.kcalTotal = active + resting
  if (active !== undefined) d.kcalActive = active
  if (resting !== undefined) d.kcalResting = resting
  const dist = num(o.totalDistanceMeters)
  if (dist !== undefined) d.distanceM = dist
  const rhr = num(o.restingHeartRate ?? (o.restingHeartRateValue as unknown))
  if (rhr) d.restingHr = rhr
  return Object.keys(d).length > 1 ? d : undefined
}

/** The overall score is sleepScores.overallScore in exports, sleepScores.overall.value in the web API. */
function sleepScore(o: Obj): number | undefined {
  const s = o.sleepScores as Obj | undefined
  if (s && typeof s === 'object') {
    const v = num(s.overallScore) ?? num((s.overall as Obj | undefined)?.value) ?? num(s.overall)
    if (v !== undefined) return v
  }
  return num(o.overallSleepScore) ?? num(o.sleepScore)
}

/** One night of sleep. It belongs to calendarDate, the day you woke up. */
export function parseSleep(o: Obj): Partial<DayStats> | undefined {
  const day = dayOf(o.calendarDate)
  if (!day) return undefined
  const s: SleepStats = {}
  const score = sleepScore(o)
  if (score !== undefined) s.score = score
  const start = time(o.sleepStartTimestampGMT)
  const end = time(o.sleepEndTimestampGMT)
  if (start !== undefined) s.start = start
  if (end !== undefined) s.end = end
  for (const [k, f] of [
    ['deep', 'deepSleepSeconds'],
    ['light', 'lightSleepSeconds'],
    ['rem', 'remSleepSeconds'],
    ['awake', 'awakeSleepSeconds'],
  ] as const) {
    const v = num(o[f])
    if (v !== undefined) s[k] = v
  }
  // Nights the watch didn't record come through with only the window; leave them out.
  if (s.score === undefined && s.deep === undefined && s.light === undefined && s.rem === undefined) return undefined
  return { day, sleep: s }
}

const isSleep = (o: Obj) => 'sleepStartTimestampGMT' in o || 'deepSleepSeconds' in o || 'sleepScores' in o
const isDaily = (o: Obj) => 'totalSteps' in o || 'totalKilocalories' in o || 'activeKilocalories' in o

/** Finds day records in any JSON shape: an array of records, or one object holding such arrays. */
export function collect(json: unknown, into: Map<string, Partial<DayStats>>): number {
  let found = 0
  const visit = (v: unknown, depth: number) => {
    if (depth > 3 || !v || typeof v !== 'object') return
    if (Array.isArray(v)) {
      for (const x of v) visit(x, depth + 1)
      return
    }
    const o = v as Obj
    if ('calendarDate' in o && (isSleep(o) || isDaily(o))) {
      const d = isSleep(o) ? parseSleep(o) : parseDaily(o)
      if (d?.day) {
        merge(into, d)
        found++
      }
      return
    }
    for (const x of Object.values(o)) if (x && typeof x === 'object') visit(x, depth + 1)
  }
  visit(json, 0)
  return found
}

function merge(into: Map<string, Partial<DayStats>>, d: Partial<DayStats>) {
  const old = into.get(d.day!) ?? {}
  into.set(d.day!, { ...old, ...d, sleep: d.sleep ? { ...old.sleep, ...d.sleep } : old.sleep })
}

/** Only the wellness summaries are worth inflating; activity FIT files and everything else are skipped. */
export const wanted = (name: string) => {
  const n = name.toLowerCase()
  return n.endsWith('.json') && (n.includes('uds') || n.includes('sleep') || n.includes('wellness') || n.includes('aggregator'))
}

/** Reads any mix of Garmin export zips and loose JSON files. */
export async function readGarmin(files: File[], onProgress?: (msg: string) => void): Promise<ImportResult> {
  const days = new Map<string, Partial<DayStats>>()
  let used = 0
  const take = async (text: string) => {
    try {
      if (collect(JSON.parse(text), days) > 0) used++
    } catch {
      /* not JSON we know */
    }
  }
  for (const f of files) {
    if (f.name.toLowerCase().endsWith('.json') || f.type === 'application/json') {
      await take(await f.text())
      continue
    }
    onProgress?.(`Reading ${f.name}…`)
    const entries = (await listZip(f)).filter((e) => wanted(e.name))
    for (let i = 0; i < entries.length; i++) {
      onProgress?.(`Reading ${i + 1} of ${entries.length}…`)
      await take(await (await readZipEntry(f, entries[i])).text())
    }
  }
  return { days, files: used }
}

/** Puts imported fields onto what's already stored; a new import wins for the fields it has. */
export function mergeDay(old: DayStats | undefined, d: Partial<DayStats>, now = Date.now()): DayStats {
  return { ...old, ...d, sleep: d.sleep || old?.sleep ? { ...old?.sleep, ...d.sleep } : undefined, day: d.day!, source: 'garmin', updatedAt: now }
}

export const fmtDuration = (sec: number) => {
  const m = Math.round(sec / 60)
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}
export const sleepTotal = (s: SleepStats) => (s.deep ?? 0) + (s.light ?? 0) + (s.rem ?? 0)
