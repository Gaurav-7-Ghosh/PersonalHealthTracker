// Small promise wrapper over IndexedDB. Everything lives on the device.
// Records are kept in memory by the store; this file only persists them.

const DB_NAME = 'workout-companion'
const VERSION = 2
// Version 2 added foods and foodlog; opening creates any store that is missing.
export const STORES = ['entries', 'routines', 'sessions', 'inbox', 'photos', 'meta', 'foods', 'foodlog'] as const
export type StoreName = (typeof STORES)[number]

let dbPromise: Promise<IDBDatabase> | null = null
let memoryOnly = false
const memory = new Map<string, Map<string, unknown>>()

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    let req: IDBOpenDBRequest
    try {
      req = indexedDB.open(DB_NAME, VERSION)
    } catch (e) {
      reject(e)
      return
    }
    req.onupgradeneeded = () => {
      const db = req.result
      for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  dbPromise.catch(() => {
    memoryOnly = true
  })
  return dbPromise
}

function mem(store: StoreName) {
  let m = memory.get(store)
  if (!m) memory.set(store, (m = new Map()))
  return m
}

async function tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode)
    const req = fn(t.objectStore(store))
    t.oncomplete = () => resolve(req ? req.result : undefined)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
  })
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  try {
    if (memoryOnly) throw 0
    return ((await tx(store, 'readonly', (s) => s.getAll())) as T[]) ?? []
  } catch {
    return [...mem(store).values()] as T[]
  }
}

export async function get<T>(store: StoreName, key: string): Promise<T | undefined> {
  try {
    if (memoryOnly) throw 0
    return (await tx(store, 'readonly', (s) => s.get(key))) as T | undefined
  } catch {
    return mem(store).get(key) as T | undefined
  }
}

type ChangeListener = (store: StoreName, key: string, value: unknown) => void
let listener: ChangeListener | undefined
/** Sync uses this to note every local change. Writes made by sync itself pass { silent: true }. */
export function onChange(fn: ChangeListener | undefined) {
  listener = fn
}
interface WriteOpts {
  silent?: boolean
}

export async function put(store: StoreName, key: string, value: unknown, opts: WriteOpts = {}): Promise<void> {
  mem(store).set(key, value)
  if (!opts.silent) listener?.(store, key, value)
  try {
    if (memoryOnly) return
    await tx(store, 'readwrite', (s) => s.put(value, key))
  } catch {
    /* falls back to memory for this visit */
  }
}

export async function del(store: StoreName, key: string, opts: WriteOpts = {}): Promise<void> {
  mem(store).delete(key)
  if (!opts.silent) listener?.(store, key, undefined)
  try {
    if (memoryOnly) return
    await tx(store, 'readwrite', (s) => s.delete(key))
  } catch {
    /* ignore */
  }
}

export async function clearAll(): Promise<void> {
  for (const s of STORES) {
    mem(s).clear()
    try {
      if (!memoryOnly) await tx(s, 'readwrite', (st) => st.clear())
    } catch {
      /* ignore */
    }
  }
}

export async function allKeys(store: StoreName): Promise<string[]> {
  try {
    if (memoryOnly) throw 0
    return ((await tx(store, 'readonly', (s) => s.getAllKeys())) as string[]) ?? []
  } catch {
    return [...mem(store).keys()]
  }
}

export function isPersistent() {
  return !memoryOnly
}
