import { useMemo, useState } from 'react'
import { FormCard } from '../components/FormCard'
import { LinkThumb } from '../components/LinkThumb'
import { Icon } from '../components/Icon'
import { Empty, EntryPicker, RenameSheet, Sheet, Tag, TopBar } from '../components/ui'
import { bestSet, useStore } from '../store'
import { rankSwaps, recentEntryIds } from '../swap'
import { kindLabel, platformOf } from '../taxonomy'
import type { Entry, SetLog } from '../types'
import { fmtDate, fmtNum } from '../util'

export function fmtSet(s: SetLog, e: Entry) {
  if (e.measure === 'hold') return `${s.hold ?? 0} s${s.tightness ? ` · tight ${s.tightness}/5` : ''}`
  if (e.measure === 'reps' || !s.weight) return `${s.reps ?? 0} reps${s.tightness ? ` · tight ${s.tightness}/5` : ''}`
  return `${fmtNum(s.weight)} kg × ${s.reps ?? 0}`
}

export function EntryView({ id }: { id: string }) {
  const store = useStore()
  const { entry, entries, go, history, sessions, routines, saveRoutine, saveEntry, startSession, notify, settings } = store
  const e = entry(id)
  const [pickSwap, setPickSwap] = useState(false)
  const [toRoutine, setToRoutine] = useState(false)
  const [renaming, setRenaming] = useState(false)

  const swaps = useMemo(
    () => (e ? rankSwaps(e, entries, { busy: [], recent: recentEntryIds(sessions), limit: 4 }) : []),
    [e, entries, sessions],
  )
  if (!e) return <Empty title="This entry was deleted" />

  const hist = history(e.id)
  const allSets = hist.flatMap((h) => h.item.sets)
  const best = bestSet(allSets)
  const linkGroups = groupBy(e.links, (l) => l.label || 'Links')
  const noteGroups = groupBy(e.notes, (n) => n.label || 'Notes')

  return (
    <div className="screen">
      <TopBar
        sub={kindLabel(e.kind)}
        right={
          <button type="button" className="icon-btn" aria-label="Edit" onClick={() => go({ name: 'edit', id: e.id })}>
            <Icon name="edit" />
          </button>
        }
      />
      <div className="title-row">
        <h1 className="entry-title">{e.name}</h1>
        <button type="button" className="icon-btn" aria-label="Rename" onClick={() => setRenaming(true)}>
          <Icon name="edit" size={18} />
        </button>
      </div>
      <RenameSheet entry={e} open={renaming} onClose={() => setRenaming(false)} />
      <div className="tags">
        {e.pattern && <Tag>{e.pattern}</Tag>}
        {e.equipment.map((q) => (
          <Tag key={q}>{q}</Tag>
        ))}
        {e.regions.map((r) => (
          <Tag key={r} tone="soft">
            {r}
          </Tag>
        ))}
      </div>

      <FormCard entry={e} onAddPhotos={() => go({ name: 'formEdit', id: e.id })} onEdit={() => go({ name: 'formEdit', id: e.id })} />

      {Object.entries(linkGroups).length > 0 && (
        <section className="block">
          <h2>Videos and links</h2>
          {Object.entries(linkGroups).map(([label, links]) => (
            <div key={label} className="kv">
              <div className="kv-key">{label}</div>
              <div className="kv-vals">
                {links.map((l) => (
                  <a key={l.id} className="link-row" href={l.url} target="_blank" rel="noreferrer">
                    <LinkThumb link={l} />
                    <span className="list-main">
                      <span className="list-name clamp">{l.title || l.url}</span>
                      <span className="list-sub">{platformOf(l.url)} · needs network</span>
                    </span>
                    <Icon name="external" size={16} />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {Object.entries(noteGroups).length > 0 && (
        <section className="block">
          <h2>Notes</h2>
          {Object.entries(noteGroups).map(([label, notes]) => (
            <div key={label} className="kv">
              <div className="kv-key">{label}</div>
              <div className="kv-vals">
                {notes.map((n) => (
                  <p key={n.id} className="note-body">
                    {n.body}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {e.muscles.length > 0 && (
        <section className="block">
          <h2>Muscles</h2>
          <div className="tags">
            {e.muscles.map((m) => (
              <span key={m.name} className={'muscle ' + m.role}>
                {m.name}
              </span>
            ))}
          </div>
          <div className="legend muted small">
            <span className="muscle primary">Primary</span>
            <span className="muscle secondary">Secondary</span>
            <span className="muscle stabiliser">Stabiliser</span>
          </div>
        </section>
      )}

      <section className="block">
        <div className="section-head">
          <h2>Swaps if it's busy</h2>
          <button type="button" className="link-btn" onClick={() => setPickSwap(true)}>
            Pin a swap
          </button>
        </div>
        {swaps.length ? (
          <ul className="list compact">
            {swaps.map((s) => (
              <li key={s.entry.id}>
                <button type="button" className="list-row" onClick={() => go({ name: 'entry', id: s.entry.id })}>
                  <span className="list-main">
                    <span className="list-name">
                      {s.pinned && <Icon name="pin" size={14} className="accent-ink" />} {s.entry.name}
                    </span>
                    <span className="list-sub">{s.reasons.join(' · ')}</span>
                  </span>
                  <span className="score">{Math.round(s.score * 100)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No close alternatives yet. Pin one you like.</p>
        )}
      </section>

      <section className="block">
        <h2>History</h2>
        {hist.length ? (
          <>
            <div className="grid-2">
              <div className="stat">
                <div className="eyebrow">Last · {fmtDate(hist[0].session.startedAt)}</div>
                <div className="stat-val">{hist[0].item.sets.map((s) => fmtSet(s, e)).join(', ')}</div>
              </div>
              <div className="stat">
                <div className="eyebrow">Best set</div>
                <div className="stat-val">{best ? fmtSet(best, e) : '-'}</div>
              </div>
            </div>
            <ul className="history-list">
              {hist.slice(1, 6).map((h) => (
                <li key={h.session.id}>
                  <span className="muted">{fmtDate(h.session.startedAt)}</span>
                  <span>{h.item.sets.map((s) => fmtSet(s, e)).join(', ')}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="muted">Not logged yet.</p>
        )}
      </section>

      <div className="sticky-actions">
        <button
          type="button"
          className="btn primary"
          onClick={async () => {
            if (store.active) {
              store.updateActive((s) => ({
                ...s,
                items: [...s.items, { entryId: e.id, target: { entryId: e.id, sets: 3 }, sets: [] }],
                current: s.items.length,
              }))
              notify(`Added to ${store.active.name}`)
            } else await startSession({ name: e.name, entryIds: [e.id] })
            go({ name: 'session' })
          }}
        >
          {store.active ? 'Add to current session' : 'Log now'}
        </button>
        <button type="button" className="btn ghost" onClick={() => setToRoutine(true)}>
          Add to routine
        </button>
      </div>

      <EntryPicker
        open={pickSwap}
        onClose={() => setPickSwap(false)}
        title="Pin a swap"
        exclude={[e.id, ...e.pinnedSwaps]}
        onPick={(p) => {
          saveEntry({ ...e, pinnedSwaps: [...e.pinnedSwaps, p.id] })
          notify(`${p.name} pinned as a swap`)
        }}
      />
      <Sheet open={toRoutine} onClose={() => setToRoutine(false)} title="Add to routine">
        <ul className="list">
          {routines.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="list-row"
                onClick={() => {
                  const isHold = e.measure === 'hold'
                  saveRoutine({ ...r, items: [...r.items, { entryId: e.id, sets: e.kind === 'strength' ? 3 : 2, reps: isHold ? undefined : 10, hold: isHold ? 30 : undefined }] })
                  setToRoutine(false)
                  notify(`Added to ${r.name}`)
                }}
              >
                <span className="list-main">
                  <span className="list-name">{r.name}</span>
                  <span className="list-sub">{r.items.length} exercises</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="muted small">Rest timers use {settings.restStrength} s for strength and {settings.restMobility} s for mobility by default.</p>
      </Sheet>
    </div>
  )
}

function groupBy<T>(list: T[], key: (t: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {}
  for (const x of list) (out[key(x)] ??= []).push(x)
  return out
}
