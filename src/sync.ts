// Optional sync between devices through your own Supabase project (free tier).
// The app stays offline-first: every change is still written to IndexedDB first, and is also noted in an
// outbox. When there's signal, sync pulls other devices' changes, then pushes the outbox. Each record is
// one row; the newest change wins (by the time it was made). Photos go to a private Storage bucket.
// See docs/SYNC.md for the Supabase setup and the SQL.
import * as db from './db'
import type { StoreName } from './db'
import type { Entry, Settings } from './types'
import { savePhoto } from './util'

export interface SyncConfig {
  url: string
  key: string
}
interface Auth {
  access: string
  refresh: string
  expires: number
  userId: string
  email: string
}
interface SyncState {
  config?: SyncConfig
  auth?: Auth
  /** synced_at of the newest row pulled so far (server time). */
  cursor?: string
  lastSync?: number
  /** True until the first sync after sign-in, when both devices' data is merged. */
  merging?: boolean
}
export interface SyncStatus {
  configured: boolean
  signedIn: boolean
  email?: string
  syncing: boolean
  lastSync?: number
  pending: number
  error?: string
}

const RECORD_STORES: StoreName[] = ['entries', 'routines', 'sessions', 'inbox']
const BUCKET = 'photos'

let state: SyncState = {}
/** "store/key" -> time of the local change. */
let outbox: Record<string, number> = {}
let syncing = false
let again = false
let error: string | undefined
let onRemote: (() => void) | undefined
/** What this device last sent, so its own rows coming back in a pull are skipped. */
const sentByMe = new Map<string, number>()
let timer: number | undefined
/** Photos the other device hasn't uploaded yet, and when we last asked. */
const missingPhotos = new Map<string, number>()
const listeners = new Set<() => void>()
let snapshot: SyncStatus = makeStatus()

function makeStatus(): SyncStatus {
  return {
    configured: !!state.config,
    signedIn: !!state.auth,
    email: state.auth?.email,
    syncing,
    lastSync: state.lastSync,
    pending: Object.keys(outbox).length,
    error,
  }
}
function emit() {
  snapshot = makeStatus()
  listeners.forEach((fn) => fn())
}
export function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
export const getStatus = () => snapshot

const saveState = () => db.put('meta', 'sync', state, { silent: true })
const saveOutbox = () => db.put('meta', 'outbox', outbox, { silent: true })
const config = () => state.config

/** Starter entries nobody has touched are the same on every device, so they aren't sent. */
const untouched = (store: StoreName, v: unknown) => store === 'entries' && !!(v as Entry).sample && (v as Entry).updatedAt === (v as Entry).createdAt

function track(store: StoreName, key: string, value: unknown) {
  if (!state.auth) return
  if (store === 'meta' && key !== 'settings') return
  if (value !== undefined && untouched(store, value)) return
  outbox[`${store}/${key}`] = Date.now()
  saveOutbox()
  emit()
  schedule(2000)
}

/** Call once at start-up. onRemoteChange runs after other devices' changes were written locally. */
export async function init(onRemoteChange: () => void) {
  if (onRemote) return
  onRemote = onRemoteChange
  state = (await db.get<SyncState>('meta', 'sync')) ?? {}
  outbox = (await db.get<Record<string, number>>('meta', 'outbox')) ?? {}
  db.onChange(track)
  emit()
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => schedule(0))
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && schedule(0))
    window.setInterval(() => document.visibilityState === 'visible' && schedule(0), 60_000)
  }
  schedule(0)
}

function schedule(ms: number) {
  if (!state.auth) return
  window.clearTimeout(timer)
  timer = window.setTimeout(() => void syncNow(), ms)
}

/** Blank fields keep what was saved before. */
export function setConfig(c: SyncConfig) {
  const url = c.url.trim().replace(/\/+$/, '') || state.config?.url || ''
  const key = c.key.trim() || state.config?.key || ''
  state = { ...state, config: { url, key } }
  saveState()
  emit()
}

// ---- HTTP ----

class HttpError extends Error {
  constructor(
    public status: number,
    msg: string,
  ) {
    super(msg)
  }
}

async function call(path: string, init: RequestInit & { auth?: boolean } = {}, retried = false): Promise<Response> {
  const c = config()
  if (!c) throw new Error('Sync is not set up')
  const headers = new Headers(init.headers)
  headers.set('apikey', c.key)
  if (init.auth !== false) {
    await freshToken()
    headers.set('Authorization', `Bearer ${state.auth!.access}`)
  }
  let res: Response
  try {
    res = await fetch(c.url + path, { ...init, headers })
  } catch {
    throw new HttpError(0, 'No connection')
  }
  // An access token the server already considers expired: refresh it and try once more.
  if (res.status === 401 && init.auth !== false && !retried && state.auth) {
    state.auth.expires = 0
    return call(path, init, true)
  }
  if (!res.ok) {
    let msg = res.statusText
    try {
      const j = await res.json()
      msg = j.error_description ?? j.msg ?? j.message ?? j.error ?? msg
    } catch {
      /* not json */
    }
    throw new HttpError(res.status, String(msg))
  }
  return res
}

function takeAuth(j: { access_token: string; refresh_token: string; expires_in: number; user: { id: string; email?: string } }, email: string) {
  state.auth = { access: j.access_token, refresh: j.refresh_token, expires: Date.now() + j.expires_in * 1000, userId: j.user.id, email: j.user.email ?? email }
}

async function freshToken() {
  const a = state.auth
  if (!a) throw new HttpError(401, 'Signed out')
  if (a.expires - 60_000 > Date.now()) return
  let res: Response
  try {
    res = await call('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      auth: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: a.refresh }),
    })
  } catch (e) {
    if ((e as HttpError).status === 0) throw e
    throw new HttpError(401, 'Signed out')
  }
  takeAuth(await res.json(), a.email)
  await saveState()
}

// ---- Sign in / out ----

export async function signIn(email: string, password: string) {
  const res = await call('/auth/v1/token?grant_type=password', {
    method: 'POST',
    auth: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  })
  takeAuth(await res.json(), email.trim())
  // First sync on this device: send everything here and pull everything there; newest wins.
  state.cursor = undefined
  state.merging = true
  for (const store of RECORD_STORES)
    for (const key of await db.allKeys(store)) {
      const v = await db.get<Record<string, number>>(store, key)
      if (v && !untouched(store, v)) outbox[`${store}/${key}`] = v.updatedAt ?? v.endedAt ?? v.startedAt ?? v.createdAt ?? 0
    }
  for (const key of await db.allKeys('photos')) outbox[`photos/${key}`] = 0
  outbox['meta/settings'] = 0
  error = undefined
  await saveState()
  await saveOutbox()
  emit()
  await syncNow()
}

export async function signOut() {
  state = { config: state.config }
  outbox = {}
  error = undefined
  await saveState()
  await saveOutbox()
  emit()
}

// ---- Sync ----

interface Row {
  store: string
  id: string
  data: unknown
  deleted: boolean
  modified: number
  synced_at?: string
}

export async function syncNow(): Promise<void> {
  if (!state.auth || !config()) return
  if (syncing) {
    again = true
    return
  }
  syncing = true
  emit()
  try {
    const changed = await pull()
    await push()
    const gotPhotos = await fetchMissingPhotos()
    state.merging = false
    state.lastSync = Date.now()
    error = undefined
    await saveState()
    if (changed || gotPhotos) onRemote?.()
  } catch (e) {
    const err = e as HttpError
    if (err.message === 'Signed out') {
      state.auth = undefined
      await saveState()
      error = 'Signed out. Sign in again to keep syncing.'
    } else error = err.status === 0 ? 'Offline. Changes will sync when you have signal.' : err.message
  } finally {
    syncing = false
    emit()
    if (again) {
      again = false
      schedule(500)
    }
  }
}

async function pull(): Promise<boolean> {
  const uid = state.auth!.userId
  let changed = false
  for (;;) {
    const after = state.cursor ? `&synced_at=gt.${encodeURIComponent(state.cursor)}` : ''
    const res = await call(`/rest/v1/records?select=store,id,data,deleted,modified,synced_at&user_id=eq.${uid}${after}&order=synced_at.asc&limit=500`)
    const rows = (await res.json()) as Row[]
    for (const r of rows) if (await apply(r)) changed = true
    if (rows.length) {
      state.cursor = rows[rows.length - 1].synced_at
      await saveState()
      await saveOutbox()
    }
    if (rows.length < 500) return changed
  }
}

async function apply(r: Row): Promise<boolean> {
  const k = `${r.store}/${r.id}`
  const mine = outbox[k]
  if (r.store === 'meta' && r.id === 'settings') return applySettings(r)
  if (!RECORD_STORES.includes(r.store as StoreName)) return false
  if (mine !== undefined && mine > r.modified) return false
  if (mine === undefined && sentByMe.get(k) === r.modified) return false
  if (mine !== undefined) delete outbox[k]
  const store = r.store as StoreName
  if (r.deleted) {
    if ((await db.get(store, r.id)) === undefined) return false
    await db.del(store, r.id, { silent: true })
  } else await db.put(store, r.id, r.data, { silent: true })
  return true
}

/** Busy equipment and the starter-data version stay per device. While merging, both devices' lists are kept. */
async function applySettings(r: Row): Promise<boolean> {
  const k = 'meta/settings'
  const mine = outbox[k]
  if (r.deleted || !r.data || (mine !== undefined && mine > r.modified)) return false
  const local = (await db.get<Settings>('meta', 'settings')) ?? ({} as Settings)
  const remote = r.data as Settings
  const next: Settings = { ...local, ...remote, busyEquipment: local.busyEquipment ?? [], seedVersion: local.seedVersion ?? remote.seedVersion }
  delete outbox[k]
  if (state.merging) {
    const ids = new Set((remote.lists ?? []).map((l) => l.id))
    const extra = (local.lists ?? []).filter((l) => !ids.has(l.id))
    if (extra.length) {
      next.lists = [...(remote.lists ?? []), ...extra]
      outbox[k] = Date.now()
    }
  }
  await db.put('meta', 'settings', next, { silent: true })
  return true
}

async function push() {
  const uid = state.auth!.userId
  const keys = Object.entries(outbox)
  if (!keys.length) return
  const rows: (Row & { user_id: string })[] = []
  const sent: [string, number][] = []
  const photos: [string, number][] = []
  for (const [k, modified] of keys) {
    const i = k.indexOf('/')
    const store = k.slice(0, i) as StoreName
    const id = k.slice(i + 1)
    if (store === 'photos') {
      photos.push([id, modified])
      continue
    }
    let data = await db.get<Record<string, unknown>>(store, id)
    if (store === 'meta' && data) {
      const { busyEquipment: _b, ...rest } = data
      data = rest
    }
    rows.push({ user_id: uid, store, id, data: data ?? null, deleted: data === undefined, modified: modified || 1 })
    sent.push([k, modified])
  }
  for (let i = 0; i < rows.length; i += 100) {
    await call('/rest/v1/records?on_conflict=user_id,store,id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows.slice(i, i + 100)),
    })
    done(sent.slice(i, i + 100))
  }
  for (const [id, modified] of photos) {
    const blob = await db.get<Blob>('photos', id)
    const path = `/storage/v1/object/${BUCKET}/${uid}/${encodeURIComponent(id)}`
    if (blob) {
      await call(path, { method: 'POST', headers: { 'Content-Type': blob.type || 'image/jpeg', 'x-upsert': 'true' }, body: blob })
    } else {
      try {
        await call(path, { method: 'DELETE' })
      } catch (e) {
        if ((e as HttpError).status !== 400 && (e as HttpError).status !== 404) throw e
      }
    }
    done([[`photos/${id}`, modified]])
  }
}

/** Clears outbox keys that haven't changed again since they were sent. */
function done(sent: [string, number][]) {
  for (const [k, m] of sent) {
    sentByMe.set(k, m || 1)
    if (outbox[k] === m) delete outbox[k]
  }
  saveOutbox()
  emit()
}

/** Downloads photos that entries on this device point to but that aren't here yet. */
async function fetchMissingPhotos(): Promise<boolean> {
  const uid = state.auth!.userId
  const have = new Set(await db.allKeys('photos'))
  const want = new Set<string>()
  for (const e of await db.getAll<Entry>('entries')) {
    for (const p of e.photos) want.add(p.id)
    for (const l of e.links) if (l.cover) want.add(l.cover)
  }
  let got = false
  for (const id of want) {
    if (have.has(id) || (missingPhotos.get(id) ?? 0) > Date.now() - 5 * 60_000) continue
    try {
      const res = await call(`/storage/v1/object/authenticated/${BUCKET}/${uid}/${encodeURIComponent(id)}`)
      await savePhoto(id, await res.blob(), { silent: true })
      got = true
    } catch (e) {
      const s = (e as HttpError).status
      if (s === 400 || s === 404) missingPhotos.set(id, Date.now()) // not uploaded yet by the other device
      else throw e
    }
  }
  return got
}
