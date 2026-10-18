import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { BookmarkMark, Chip, Empty, Thumb } from '../components/ui'
import { useStore } from '../store'
import { KINDS, REGIONS, kindLabel } from '../taxonomy'
import type { Kind } from '../types'
import { ago } from '../util'

// Kept outside the component so filters survive opening an entry and coming back.
const memo = { q: '', kind: 'all' as Kind | 'all', region: '', muscle: '', marked: false }

export function Library() {
  const { entries, go, history } = useStore()
  const [q, setQ] = useState(memo.q)
  const [kind, setKind] = useState(memo.kind)
  const [region, setRegion] = useState(memo.region)
  const [muscle, setMuscle] = useState(memo.muscle)
  const [marked, setMarked] = useState(memo.marked)
  Object.assign(memo, { q, kind, region, muscle, marked })

  const muscles = REGIONS.find((r) => r.name === region)?.muscles ?? []
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return entries.filter(
      (e) =>
        (kind === 'all' || e.kind === kind) &&
        (!marked || !!e.bookmarkedAt) &&
        (!region || e.regions.includes(region) || e.muscles.some((m) => REGIONS.find((r) => r.name === region)?.muscles.includes(m.name) && m.role === 'primary')) &&
        (!muscle || e.muscles.some((m) => m.name === muscle)) &&
        (!needle ||
          e.name.toLowerCase().includes(needle) ||
          e.muscles.some((m) => m.name.toLowerCase().includes(needle)) ||
          e.links.some((l) => l.label.toLowerCase().includes(needle) || l.title?.toLowerCase().includes(needle)) ||
          e.notes.some((n) => n.body.toLowerCase().includes(needle))),
    )
  }, [entries, q, kind, region, muscle, marked])

  return (
    <div className="screen">
      <header className="hero row-between">
        <h1>Library</h1>
        <button type="button" className="btn small primary" onClick={() => go({ name: 'edit', kind: kind === 'all' ? undefined : kind })}>
          <Icon name="plus" size={18} /> New
        </button>
      </header>

      <div className="search">
        <Icon name="search" />
        <input id="lib-search" placeholder="Search name, muscle, notes or link labels" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search library" />
        {q && (
          <button type="button" className="icon-btn" aria-label="Clear search" onClick={() => setQ('')}>
            <Icon name="close" size={18} />
          </button>
        )}
      </div>

      <div className="segmented" role="tablist" aria-label="Type">
        <button type="button" role="tab" aria-selected={kind === 'all'} onClick={() => setKind('all')}>
          All
        </button>
        {KINDS.map((k) => (
          <button key={k.id} type="button" role="tab" aria-selected={kind === k.id} onClick={() => setKind(k.id)}>
            {k.plural}
          </button>
        ))}
      </div>

      <div className="chips scroll" aria-label="Body region">
        <Chip on={marked} onClick={() => setMarked(!marked)} label="Bookmarked only">
          <Icon name="bookmark" size={14} /> Bookmarked
        </Chip>
        {REGIONS.map((r) => (
          <Chip
            key={r.name}
            on={region === r.name}
            onClick={() => {
              setRegion(region === r.name ? '' : r.name)
              setMuscle('')
            }}
          >
            {r.name}
          </Chip>
        ))}
      </div>
      {region && (
        <div className="chips scroll sub" aria-label="Muscle">
          {muscles.map((m) => (
            <Chip key={m} on={muscle === m} onClick={() => setMuscle(muscle === m ? '' : m)}>
              {m}
            </Chip>
          ))}
        </div>
      )}

      <div className="muted small count">
        {list.length} {list.length === 1 ? 'entry' : 'entries'}
      </div>
      {list.length ? (
        <ul className="list">
          {list.map((e) => {
            const last = history(e.id)[0]
            return (
              <li key={e.id}>
                <button type="button" className="list-row" onClick={() => go({ name: 'entry', id: e.id })}>
                  <Thumb entry={e} />
                  <span className="list-main">
                    <span className="list-name">
                      {e.name} <BookmarkMark entry={e} />
                    </span>
                    <span className="list-sub">
                      {kindLabel(e.kind)} · {e.equipment.slice(0, 2).join(', ') || 'Bodyweight'}
                    </span>
                    <span className="list-meta">
                      {last ? `Done ${ago(last.session.startedAt)}` : 'Not logged yet'}
                      {e.photos.length > 0 && ` · ${e.photos.length} photos`}
                      {e.links.length > 0 && ` · ${e.links.length} links`}
                    </span>
                  </span>
                  <Icon name="next" size={18} className="chev" />
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <Empty
          title="Nothing here yet"
          body="Clear a filter, or add your own exercise with its cues, photos and links."
          action={
            <button type="button" className="btn primary" onClick={() => go({ name: 'edit' })}>
              Add an exercise
            </button>
          }
        />
      )}
    </div>
  )
}
