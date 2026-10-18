import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { KINDS, kindLabel } from '../taxonomy'
import type { Entry, Kind } from '../types'
import { photoUrl } from '../util'
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
  return (
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
    </div>
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
  return (
    <div className={big ? 'stepper big' : 'stepper'}>
      <label className="eyebrow" htmlFor={id}>
        {label}
      </label>
      <div className="stepper-value">
        <input
          id={id}
          inputMode="decimal"
          value={Number.isFinite(value) ? String(value) : ''}
          onChange={(e) => {
            const n = parseFloat(e.target.value.replace(',', '.'))
            onChange(Number.isFinite(n) ? n : 0)
          }}
          onFocus={(e) => e.target.select()}
          style={{ width: `${Math.max(2, String(value).length) + 0.6}ch` }}
        />
        {unit && <span className="unit">{unit}</span>}
      </div>
      <div className="stepper-btns">
        <button type="button" aria-label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}>
          <Icon name="minus" size={22} />
        </button>
        <button type="button" aria-label={`Increase ${label}`} onClick={() => onChange(+(value + step).toFixed(2))}>
          <Icon name="plus" size={22} />
        </button>
      </div>
    </div>
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
