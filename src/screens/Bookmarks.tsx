// Bookmarked exercises, grouped by section (strength, mobility, stretches, ...).
import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Empty, Thumb, TopBar } from '../components/ui'
import { useStore } from '../store'
import { KINDS } from '../taxonomy'
import type { Entry, Kind } from '../types'

export function Bookmarks({ kind: initial }: { kind?: Kind }) {
  const { entries, go } = useStore()
  const marked = entries.filter((e) => e.bookmarkedAt).sort((a, b) => (b.bookmarkedAt ?? 0) - (a.bookmarkedAt ?? 0))
  const sections = KINDS.filter((k) => marked.some((e) => e.kind === k.id))
  const [kind, setKind] = useState<Kind | 'all'>(initial && sections.some((k) => k.id === initial) ? initial : 'all')
  const shown = sections.filter((k) => kind === 'all' || k.id === kind)

  const row = (e: Entry) => (
    <li key={e.id}>
      <button type="button" className="list-row" onClick={() => go({ name: 'entry', id: e.id })}>
        <Thumb entry={e} />
        <span className="list-main">
          <span className="list-name">{e.name}</span>
          <span className="list-sub">{e.muscles.filter((m) => m.role === 'primary').map((m) => m.name).join(', ') || e.regions.join(', ')}</span>
          <span className="list-meta">
            {[e.cues.length && `${e.cues.length} cues`, e.photos.length && `${e.photos.length} photos`, e.links.length && `${e.links.length} links`, e.notes.length && `${e.notes.length} notes`]
              .filter(Boolean)
              .join(' · ') || 'No notes yet'}
          </span>
        </span>
        <Icon name="next" size={18} className="chev" />
      </button>
    </li>
  )

  return (
    <div className="screen">
      <TopBar title="Bookmarks" />
      <h1>Bookmarks</h1>
      {marked.length === 0 ? (
        <Empty
          title="No bookmarks yet"
          body="Open any exercise, stretch or mobility drill and tap the bookmark at the top. It shows up here under its section."
          action={
            <button type="button" className="btn primary" onClick={() => go({ name: 'library' })}>
              Browse the library
            </button>
          }
        />
      ) : (
        <>
          {sections.length > 1 && (
            <div className="segmented" role="tablist" aria-label="Section">
              <button type="button" role="tab" aria-selected={kind === 'all'} onClick={() => setKind('all')}>
                All {marked.length}
              </button>
              {sections.map((k) => (
                <button key={k.id} type="button" role="tab" aria-selected={kind === k.id} onClick={() => setKind(k.id)}>
                  {k.plural} {marked.filter((e) => e.kind === k.id).length}
                </button>
              ))}
            </div>
          )}
          {shown.map((k) => (
            <section key={k.id} className="block" aria-label={k.plural}>
              <h2>{k.plural}</h2>
              <ul className="list">{marked.filter((e) => e.kind === k.id).map(row)}</ul>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
