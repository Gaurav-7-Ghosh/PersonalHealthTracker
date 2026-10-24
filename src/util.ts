import * as db from './db'

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

export const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

export function ago(t: number): string {
  const days = Math.floor((Date.now() - t) / 864e5)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  return fmtDate(t)
}

export const fmtClock = (s: number) => {
  const sec = Math.max(0, Math.round(s))
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

/** Rest as people say it: "45 s", "2 min", "1 min 30 s". */
export const fmtRest = (s: number) => {
  const m = Math.floor(s / 60)
  const r = Math.round(s % 60)
  return m ? (r ? `${m} min ${r} s` : `${m} min`) : `${r} s`
}

export const fmtDuration = (ms: number) => {
  const m = Math.round(ms / 60000)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`
}

export const fmtNum = (n?: number) => (n === undefined ? '' : Number.isInteger(n) ? String(n) : n.toFixed(1))

// Resize a photo to at most 1600 px on its long side as JPEG before storing it.
// Screenshots with handwriting need more pixels than a plain photo to stay readable.
export async function resizeImage(file: Blob, max = 1600): Promise<Blob> {
  return redraw(file, (img) => ({ sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight }), max)
}

/** Cut a rectangle (in the image's pixels) out of a stored photo. */
export async function cropImage(file: Blob, r: { x: number; y: number; w: number; h: number }): Promise<Blob> {
  return redraw(file, () => ({ sx: r.x, sy: r.y, sw: r.w, sh: r.h }), Infinity)
}

async function redraw(file: Blob, area: (img: HTMLImageElement) => { sx: number; sy: number; sw: number; sh: number }, max: number): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = url
    })
    const { sx, sy, sw, sh } = area(img)
    const scale = Math.min(1, max / Math.max(sw, sh))
    const w = Math.max(1, Math.round(sw * scale))
    const h = Math.max(1, Math.round(sh * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85))
    return blob ?? file
  } finally {
    URL.revokeObjectURL(url)
  }
}

const photoUrls = new Map<string, string>()

export async function photoUrl(id: string): Promise<string | undefined> {
  const cached = photoUrls.get(id)
  if (cached) return cached
  const blob = await db.get<Blob>('photos', id)
  if (!blob) return undefined
  const url = URL.createObjectURL(blob)
  photoUrls.set(id, url)
  return url
}

const photoWaiters = new Map<string, Set<() => void>>()

/** Runs fn when a photo that wasn't on this device yet arrives (from sync). Returns an unsubscribe. */
export function whenPhotoArrives(id: string, fn: () => void) {
  let set = photoWaiters.get(id)
  if (!set) photoWaiters.set(id, (set = new Set()))
  set.add(fn)
  return () => {
    set.delete(fn)
  }
}

export async function savePhoto(id: string, blob: Blob, opts?: { silent?: boolean }) {
  await db.put('photos', id, blob, opts)
  photoUrls.delete(id)
  photoWaiters.get(id)?.forEach((fn) => fn())
}

export async function deletePhoto(id: string) {
  await db.del('photos', id)
  const u = photoUrls.get(id)
  if (u) URL.revokeObjectURL(u)
  photoUrls.delete(id)
}

/** The video id in a YouTube watch, share, Shorts or embed link. */
export function youtubeId(url: string): string | undefined {
  try {
    const u = new URL(url)
    const h = u.hostname.replace(/^(www|m|music)\./, '')
    if (h === 'youtu.be') return u.pathname.slice(1).split('/')[0] || undefined
    if (!h.endsWith('youtube.com')) return undefined
    return u.searchParams.get('v') ?? u.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{6,})/)?.[1]
  } catch {
    return undefined
  }
}

/** YouTube thumbnails can be worked out from the link alone, no network needed. */
export const youtubeThumb = (url: string) => {
  const id = youtubeId(url)
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : undefined
}

// Title (online only) and thumbnail for YouTube links. Instagram and TikTok don't
// share either without a developer account, so those use a typed title and your own cover.
export async function fetchLinkInfo(url: string): Promise<{ title?: string; thumb?: string }> {
  const thumb = youtubeThumb(url)
  if (!thumb) return {}
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`)
    if (!res.ok) return { thumb }
    const j = await res.json()
    return { title: j.title, thumb }
  } catch {
    return { thumb }
  }
}

export function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = rej
    r.readAsDataURL(b)
  })
}

export async function dataUrlToBlob(d: string): Promise<Blob> {
  return (await fetch(d)).blob()
}

export function extractUrl(text: string): string | undefined {
  const m = text.match(/https?:\/\/[^\s<>"']+/)
  return m?.[0]
}

let audio: AudioContext | null = null
export function beep(freq = 880, ms = 160, vol = 0.25) {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') audio.resume()
    const o = audio.createOscillator()
    const g = audio.createGain()
    o.frequency.value = freq
    g.gain.value = vol
    o.connect(g)
    g.connect(audio.destination)
    o.start()
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + ms / 1000)
    o.stop(audio.currentTime + ms / 1000 + 0.02)
  } catch {
    /* sound is optional */
  }
}

export function vibrate(ms: number | number[]) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* optional */
  }
}

type WakeLockSentinelLike = { release(): Promise<void> }
let wake: WakeLockSentinelLike | null = null
export async function keepAwake(on: boolean) {
  try {
    const nav = navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<WakeLockSentinelLike> } }
    if (on && nav.wakeLock && !wake) wake = await nav.wakeLock.request('screen')
    if (!on && wake) {
      await wake.release()
      wake = null
    }
  } catch {
    wake = null
  }
}
