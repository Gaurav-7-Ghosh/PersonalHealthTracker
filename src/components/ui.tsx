import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store'
import { KINDS, kindLabel } from '../taxonomy'
import type { Entry, Kind } from '../types'
import { photoUrl, uid } from '../util'
import { Icon } from './Icon'

export function TopBar({ title, sub, right, onBack }: { title?: string; sub?: string; right?: React.ReactNode; onBack?: () => void }) {
  const { back, canGoBack } = useStore()
  const showBack = onBack || canGoBack
  return (
    <header className="topbar">
      {showBack ? (
        <button type="button" className="icon-btn" aria-label="Back" onClick={onBack ?? back}>
          <Icon name="back" size={22} />
        </button>
      ) : (
        <span className="topbar-spacer" />
      )}
      <div className="topbar-title">
        {sub && <div className="eyebrow">{sub}</div>}
        {title && <div className="topbar-name">{title}</div>}
      </div>
      <div className="topbar-right">{right}</div>
    </header>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  // Portal to <body> so the sheet sits above the tab bar whatever screen opened it.
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

export function Confirm({
  open,
  title,
  body,
  action,
  danger,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  body?: string
  action: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {body && <p className="muted">{body}</p>}
      <div className="row-2">
        <button type="button" className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className={danger ? 'btn danger' : 'btn primary'}
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          {action}
        </button>
      </div>
    </Sheet>
  )
}

export function Stepper({
  label,
  value,
  unit,
  step,
  min = 0,
  onChange,
  big,
}: {
  label: string
  value: number
  unit?: string
  step: number
  min?: number
  onChange: (v: number) => void
  big?: boolean
}) {
  const id = 'st-' + label.toLowerCase().replace(/\W+/g, '-')
  // Typed text is kept as a draft so "62." or an empty field don't snap back while typing.
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? (Number.isFinite(value) ? String(value) : '')
  const decimals = !Number.isInteger(step)
  const commit = () => {
    if (draft === null) return
    const n = parseFloat(draft.replace(',', '.'))
    onChange(Number.isFinite(n) ? Math.max(min, n) : min)
    setDraft(null)
  }
  const nudge = (d: number) => {
    setDraft(null)
    onChange(Math.max(min, +(value + d).toFixed(2)))
  }
  return (
    <div className={big ? 'stepper big' : 'stepper'}>
      <label className="eyebrow" htmlFor={id}>
        {label}
      </label>
      <div className="stepper-value">
        <input
          id={id}
          type="text"
          inputMode={decimals ? 'decimal' : 'numeric'}
          pattern={decimals ? '[0-9]*[.,]?[0-9]*' : '[0-9]*'}
          enterKeyHint="done"
          autoComplete="off"
          value={shown}
          onChange={(e) => {
            const t = e.target.value
            if (!/^\d*([.,]\d*)?$/.test(t) || (!decimals && /[.,]/.test(t))) return
            setDraft(t)
            const n = parseFloat(t.replace(',', '.'))
            if (Number.isFinite(n)) onChange(Math.max(min, n))
          }}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          onFocus={(e) => e.target.select()}
          style={{ width: `${Math.max(2, shown.length) + 0.6}ch` }}
        />
        {unit && <span className="unit">{unit}</span>}
      </div>
      <div className="stepper-btns">
        <button type="button" aria-label={`Decrease ${label}`} onClick={() => nudge(-step)}>
          <Icon name="minus" size={20} />
        </button>
        <button type="button" aria-label={`Increase ${label}`} onClick={() => nudge(step)}>
          <Icon name="plus" size={20} />
        </button>
      </div>
    </div>
  )
}

/** Rename an exercise in place, from wherever its name is shown. */
export function RenameSheet({ entry, open, onClose }: { entry: Entry; open: boolean; onClose: () => void }) {
  const { entries, saveEntry, notify } = useStore()
  const [name, setName] = useState(entry.name)
  useEffect(() => {
    if (open) setName(entry.name)
  }, [open, entry.name])
  const clean = name.trim()
  const taken = entries.some((x) => x.id !== entry.id && x.name.toLowerCase() === clean.toLowerCase())
  const save = async () => {
    if (!clean || taken) return
    if (clean !== entry.name) {
      await saveEntry({ ...entry, name: clean, updatedAt: Date.now() })
      notify('Renamed')
    }
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Rename exercise">
      <form
        className="form"
        onSubmit={(ev) => {
          ev.preventDefault()
          save()
        }}
      >
        <div className="field">
          <label htmlFor="rename">Name</label>
          <input id="rename" value={name} onChange={(ev) => setName(ev.target.value)} autoFocus enterKeyHint="done" />
          {taken && <span className="muted small">You already have an exercise with this name.</span>}
        </div>
        <p className="muted small">Your logs, photos and links stay with it.</p>
        <button type="submit" className="btn primary" disabled={!clean || taken}>
          Save name
        </button>
      </form>
    </Sheet>
  )
}

export function Chip({ on, children, onClick, label }: { on?: boolean; children: React.ReactNode; onClick?: () => void; label?: string }) {
  return (
    <button type="button" className={on ? 'chip on' : 'chip'} aria-pressed={on} aria-label={label} onClick={onClick}>
      {children}
    </button>
  )
}

export function Tag({ children, tone }: { children: React.ReactNode; tone?: 'accent' | 'warn' | 'soft' }) {
  return <span className={'tag' + (tone ? ' ' + tone : '')}>{children}</span>
}

export function Photo({ id, alt, className }: { id: string; alt: string; className?: string }) {
  const [src, setSrc] = useState<string>()
  useEffect(() => {
    let live = true
    photoUrl(id).then((u) => live && setSrc(u))
    return () => {
      live = false
    }
  }, [id])
  return src ? <img className={className} src={src} alt={alt} /> : <div className={(className ?? '') + ' photo-ph'} />
}

export function Thumb({ entry }: { entry: Entry }) {
  const first = entry.photos.find((p) => p.position === 'start') ?? entry.photos[0]
  if (first) return <Photo id={first.id} alt="" className="thumb" />
  return (
    <div className={'thumb glyph k-' + entry.kind} aria-hidden="true">
      {entry.name
        .split(/\s+/)
        .filter((w) => /^[A-Za-z]/.test(w))
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('')}
    </div>
  )
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-title">{title}</div>
      {body && <p className="muted">{body}</p>}
      {action}
    </div>
  )
}

export function EntryPicker({
  open,
  onClose,
  onPick,
  kinds,
  title = 'Choose an exercise',
  exclude,
}: {
  open: boolean
  onClose: () => void
  onPick: (e: Entry) => void
  kinds?: Kind[]
  title?: string
  exclude?: string[]
}) {
  const { entries } = useStore()
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<Kind | 'all'>('all')
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return entries.filter(
      (e) =>
        (!kinds || kinds.includes(e.kind)) &&
        (kind === 'all' || e.kind === kind) &&
        !exclude?.includes(e.id) &&
        (!needle || e.name.toLowerCase().includes(needle) || e.regions.some((r) => r.toLowerCase().includes(needle)) || e.muscles.some((m) => m.name.toLowerCase().includes(needle))),
    )
  }, [entries, q, kind, kinds, exclude])
  const kindOpts = KINDS.filter((k) => !kinds || kinds.includes(k.id))
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="search">
        <Icon name="search" />
        <input id="picker-search" placeholder="Search name or muscle" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search exercises" />
      </div>
      {kindOpts.length > 1 && (
        <div className="chips scroll">
          <Chip on={kind === 'all'} onClick={() => setKind('all')}>
            All
          </Chip>
          {kindOpts.map((k) => (
            <Chip key={k.id} on={kind === k.id} onClick={() => setKind(k.id)}>
              {k.plural}
            </Chip>
          ))}
        </div>
      )}
      <ul className="list">
        {list.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              className="list-row"
              onClick={() => {
                onPick(e)
                onClose()
              }}
            >
              <Thumb entry={e} />
              <span className="list-main">
                <span className="list-name">{e.name}</span>
                <span className="list-sub">
                  {kindLabel(e.kind)} · {e.regions.join(', ')}
                </span>
              </span>
            </button>
          </li>
        ))}
        {!list.length && <li className="muted pad">Nothing matches. Add it from the Library.</li>}
      </ul>
    </Sheet>
  )
}

/**
 * Bookmark button. The first tap bookmarks straight away and opens "Save to",
 * where the exercise can also go into your named lists.
 */
export function BookmarkButton({ entry }: { entry: Entry }) {
  const { saveEntry, notify } = useStore()
  const [open, setOpen] = useState(false)
  const saved = !!entry.bookmarkedAt || !!entry.lists?.length
  return (
    <>
      <button
        type="button"
        className={saved ? 'icon-btn bm on' : 'icon-btn bm'}
        aria-pressed={saved}
        aria-label={saved ? 'Saved. Change bookmark and lists' : 'Bookmark'}
        onClick={async () => {
          if (!saved) {
            await saveEntry({ ...entry, bookmarkedAt: Date.now(), updatedAt: Date.now() })
            notify(`Bookmarked in ${kindLabel(entry.kind)}`)
          }
          setOpen(true)
        }}
      >
        <Icon name="bookmark" />
      </button>
      <SaveToSheet entry={entry} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function SaveToSheet({ entry, open, onClose }: { entry: Entry; open: boolean; onClose: () => void }) {
  const { entries, settings, saveEntry, saveSettings, notify } = useStore()
  const [name, setName] = useState('')
  // Read the live entry so toggles in a row build on each other.
  const cur = entries.find((x) => x.id === entry.id) ?? entry
  const inList = (id: string) => !!cur.lists?.includes(id)
  const save = (patch: Partial<Entry>) => saveEntry({ ...cur, ...patch, updatedAt: Date.now() })
  const toggleList = (id: string) => save({ lists: inList(id) ? cur.lists!.filter((x) => x !== id) : [...(cur.lists ?? []), id] })
  const addList = async () => {
    const clean = name.trim()
    if (!clean) return
    const existing = settings.lists.find((l) => l.name.toLowerCase() === clean.toLowerCase())
    const list = existing ?? { id: uid(), name: clean, createdAt: Date.now() }
    if (!existing) await saveSettings({ lists: [...settings.lists, list] })
    if (!inList(list.id)) await save({ lists: [...(cur.lists ?? []), list.id] })
    setName('')
    notify(`Added to ${list.name}`)
  }
  return (
    <Sheet open={open} onClose={onClose} title="Save to">
      <div className="save-to">
        <button type="button" className={cur.bookmarkedAt ? 'save-row on' : 'save-row'} aria-pressed={!!cur.bookmarkedAt} onClick={() => save({ bookmarkedAt: cur.bookmarkedAt ? undefined : Date.now() })}>
          <Icon name="bookmark" size={18} />
          <span className="list-main">
            <span className="list-name">Bookmarks</span>
            <span className="list-sub">Under {KINDS.find((k) => k.id === cur.kind)?.plural ?? kindLabel(cur.kind)}</span>
          </span>
          {cur.bookmarkedAt && <Icon name="check" size={18} />}
        </button>
        {settings.lists.map((l) => (
          <button key={l.id} type="button" className={inList(l.id) ? 'save-row on' : 'save-row'} aria-pressed={inList(l.id)} onClick={() => toggleList(l.id)}>
            <Icon name="routines" size={18} />
            <span className="list-main">
              <span className="list-name">{l.name}</span>
              <span className="list-sub">{entries.filter((x) => x.lists?.includes(l.id)).length} saved</span>
            </span>
            {inList(l.id) && <Icon name="check" size={18} />}
          </button>
        ))}
      </div>
      <form
        className="ink-text-row"
        onSubmit={(ev) => {
          ev.preventDefault()
          addList()
        }}
      >
        <input value={name} onChange={(ev) => setName(ev.target.value)} placeholder="New list, e.g. Morning mobility" aria-label="New list name" enterKeyHint="done" />
        <button type="submit" className="btn small primary" disabled={!name.trim()}>
          Add
        </button>
      </form>
      <button type="button" className="btn ghost" onClick={onClose}>
        Done
      </button>
    </Sheet>
  )
}

/** Small marker shown on list rows for bookmarked exercises. */
export const BookmarkMark = ({ entry }: { entry: Entry }) =>
  entry.bookmarkedAt ? (
    <span className="bm-mark" role="img" aria-label="Bookmarked">
      <Icon name="bookmark" size={14} />
    </span>
  ) : null
