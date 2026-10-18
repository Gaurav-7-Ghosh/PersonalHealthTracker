import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as db from './db'
import { SEED_ENTRIES, SEED_ROUTINES } from './seed'
import type { Entry, InboxItem, Route, Routine, RoutineItem, Session, SessionItem, SetLog, Settings } from './types'
import { deletePhoto, uid } from './util'

const DEFAULT_SETTINGS: Settings = {
  restStrength: 90,
  restMobility: 30,
  weightStep: 2.5,
  busyEquipment: [],
  seeded: false,
}

export interface Store {
  ready: boolean
  entries: Entry[]
  entry: (id: string) => Entry | undefined
  routines: Routine[]
  sessions: Session[]
  inbox: InboxItem[]
  settings: Settings
  active: Session | undefined
  route: Route
  go: (r: Route) => void
  replace: (r: Route) => void
  back: () => void
  canGoBack: boolean
  toast: string | null
  notify: (msg: string) => void
  saveEntry: (e: Entry) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  saveRoutine: (r: Routine) => Promise<void>
  deleteRoutine: (id: string) => Promise<void>
  saveSettings: (s: Partial<Settings>) => Promise<void>
  addInbox: (url: string, title?: string) => Promise<void>
  removeInbox: (id: string) => Promise<void>
  startSession: (opts: { routine?: Routine; entryIds?: string[]; name?: string }) => Promise<void>
  updateActive: (fn: (s: Session) => Session) => void
  finishActive: () => Promise<Session | undefined>
  discardActive: () => Promise<void>
  saveSession: (s: Session) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  history: (entryId: string) => { session: Session; item: SessionItem }[]
  lastSets: (entryId: string) => SetLog[] | undefined
  reload: () => Promise<void>
}

const Ctx = createContext<Store | null>(null)
export const useStore = () => useContext(Ctx)!

export function StoreProvider({ children, initialRoute }: { children: React.ReactNode; initialRoute: Route }) {
  const [ready, setReady] = useState(false)
  const [entries, setEntries] = useState<Entry[]>([])
  const [routines, setRoutines] = useState<Routine[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [active, setActive] = useState<Session | undefined>()
  const [stack, setStack] = useState<Route[]>([initialRoute])
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number>()

  const reload = useCallback(async () => {
    let s = { ...DEFAULT_SETTINGS, ...((await db.get<Settings>('meta', 'settings')) ?? {}) }
    if (!s.seeded) {
      const now = Date.now()
      for (const e of SEED_ENTRIES) await db.put('entries', e.id, { ...e, createdAt: now, updatedAt: now })
      for (const r of SEED_ROUTINES) await db.put('routines', r.id, { ...r, updatedAt: now })
      s = { ...s, seeded: true }
      await db.put('meta', 'settings', s)
    }
    const [es, rs, ss, ib, act] = await Promise.all([
      db.getAll<Entry>('entries'),
      db.getAll<Routine>('routines'),
      db.getAll<Session>('sessions'),
      db.getAll<InboxItem>('inbox'),
      db.get<Session>('meta', 'active'),
    ])
    setEntries(es.sort((a, b) => a.name.localeCompare(b.name)))
    setRoutines(rs)
    setSessions(ss.sort((a, b) => b.startedAt - a.startedAt))
    setInbox(ib.sort((a, b) => b.createdAt - a.createdAt))
    setSettings(s)
    setActive(act ?? undefined)
    setReady(true)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries])

  const notify = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2400)
  }, [])

  const go = useCallback((r: Route) => {
    setStack((s) => [...s, r])
    window.scrollTo(0, 0)
  }, [])
  const replace = useCallback((r: Route) => {
    setStack((s) => [...s.slice(0, -1), r])
    window.scrollTo(0, 0)
  }, [])
  const back = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
  }, [])

  // Tabs reset the stack so back never wanders across sections.
  const goTab = useCallback((r: Route) => {
    setStack([r])
    window.scrollTo(0, 0)
  }, [])

  const saveEntry = useCallback(async (e: Entry) => {
    const next = { ...e, updatedAt: Date.now() }
    await db.put('entries', e.id, next)
    setEntries((list) => [...list.filter((x) => x.id !== e.id), next].sort((a, b) => a.name.localeCompare(b.name)))
  }, [])

  const deleteEntry = useCallback(
    async (id: string) => {
      const e = byId.get(id)
      if (e) for (const p of e.photos) await deletePhoto(p.id)
      await db.del('entries', id)
      setEntries((list) => list.filter((x) => x.id !== id))
    },
    [byId],
  )

  const saveRoutine = useCallback(async (r: Routine) => {
    const next = { ...r, updatedAt: Date.now() }
    await db.put('routines', r.id, next)
    setRoutines((list) => [...list.filter((x) => x.id !== r.id), next])
  }, [])

  const deleteRoutine = useCallback(async (id: string) => {
    await db.del('routines', id)
    setRoutines((list) => list.filter((x) => x.id !== id))
  }, [])

  const saveSettings = useCallback(async (p: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...p }
      db.put('meta', 'settings', next)
      return next
    })
  }, [])

  const addInbox = useCallback(async (url: string, title?: string) => {
    const item: InboxItem = { id: uid(), url, title, createdAt: Date.now() }
    await db.put('inbox', item.id, item)
    setInbox((l) => [item, ...l])
  }, [])

  const removeInbox = useCallback(async (id: string) => {
    await db.del('inbox', id)
    setInbox((l) => l.filter((x) => x.id !== id))
  }, [])

  const persistActive = (s: Session | undefined) => {
    if (s) db.put('meta', 'active', s)
    else db.del('meta', 'active')
  }

  const startSession = useCallback(
    async ({ routine, entryIds, name }: { routine?: Routine; entryIds?: string[]; name?: string }) => {
      const items: SessionItem[] = routine
        ? routine.items.map((it) => ({ entryId: it.entryId, target: it, sets: [] }))
        : (entryIds ?? []).map((id) => ({ entryId: id, target: { entryId: id, sets: 3 } as RoutineItem, sets: [] }))
      const s: Session = {
        id: uid(),
        name: routine?.name ?? name ?? 'Quick session',
        type: routine?.type ?? 'gym',
        routineId: routine?.id,
        startedAt: Date.now(),
        items,
        current: 0,
      }
      setActive(s)
      persistActive(s)
      // Busy stations are per visit to the gym.
      setSettings((x) => {
        const next = { ...x, busyEquipment: [] }
        db.put('meta', 'settings', next)
        return next
      })
    },
    [],
  )

  const updateActive = useCallback((fn: (s: Session) => Session) => {
    setActive((s) => {
      if (!s) return s
      const next = fn(s)
      persistActive(next)
      return next
    })
  }, [])

  const saveSession = useCallback(async (s: Session) => {
    await db.put('sessions', s.id, s)
    setSessions((l) => [s, ...l.filter((x) => x.id !== s.id)].sort((a, b) => b.startedAt - a.startedAt))
  }, [])

  const finishActive = useCallback(async () => {
    if (!active) return undefined
    const done: Session = { ...active, endedAt: Date.now(), items: active.items.filter((i) => i.sets.length > 0) }
    setActive(undefined)
    persistActive(undefined)
    if (done.items.length || done.hiit) await saveSession(done)
    return done
  }, [active, saveSession])

  const discardActive = useCallback(async () => {
    setActive(undefined)
    persistActive(undefined)
  }, [])

  const deleteSession = useCallback(async (id: string) => {
    await db.del('sessions', id)
    setSessions((l) => l.filter((x) => x.id !== id))
  }, [])

  const historyIndex = useMemo(() => {
    const m = new Map<string, { session: Session; item: SessionItem }[]>()
    for (const s of sessions)
      for (const item of s.items) {
        if (!item.sets.length) continue
        const list = m.get(item.entryId) ?? []
        list.push({ session: s, item })
        m.set(item.entryId, list)
      }
    return m
  }, [sessions])

  const history = useCallback((id: string) => historyIndex.get(id) ?? [], [historyIndex])
  const lastSets = useCallback((id: string) => historyIndex.get(id)?.[0]?.item.sets, [historyIndex])

  const route = stack[stack.length - 1]

  const value: Store = {
    ready,
    entries,
    entry: (id) => byId.get(id),
    routines,
    sessions,
    inbox,
    settings,
    active,
    route,
    go: (r) => (['today', 'library', 'routines', 'history', 'settings'].includes(r.name) ? goTab(r) : go(r)),
    replace,
    back,
    canGoBack: stack.length > 1,
    toast,
    notify,
    saveEntry,
    deleteEntry,
    saveRoutine,
    deleteRoutine,
    saveSettings,
    addInbox,
    removeInbox,
    startSession,
    updateActive,
    finishActive,
    discardActive,
    saveSession,
    deleteSession,
    history,
    lastSets,
    reload,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function blankEntry(kind: Entry['kind'] = 'strength'): Entry {
  return {
    id: uid(),
    kind,
    measure: kind === 'strength' ? 'weight_reps' : kind === 'stretch' ? 'hold' : kind === 'hiit' ? 'time' : 'reps',
    name: '',
    regions: [],
    muscles: [],
    equipment: [],
    cues: [],
    photos: [],
    links: [],
    notes: [],
    pinnedSwaps: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function bestSet(sets: SetLog[]): SetLog | undefined {
  let best: SetLog | undefined
  for (const s of sets) {
    if (!best) best = s
    else if ((s.weight ?? 0) > (best.weight ?? 0)) best = s
    else if ((s.weight ?? 0) === (best.weight ?? 0) && (s.reps ?? s.hold ?? 0) > (best.reps ?? best.hold ?? 0)) best = s
  }
  return best
}
