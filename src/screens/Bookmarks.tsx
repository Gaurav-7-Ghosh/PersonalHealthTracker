// Bookmarks: your named lists first, then bookmarked exercises grouped by section.
import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Confirm, Empty, Sheet, Thumb, TopBar } from '../components/ui'
import { useStore } from '../store'
import { KINDS } from '../taxonomy'
import type { Entry, Kind } from '../types'
import { uid } from '../util'

function EntryRow({ e, onRemove }: { e: Entry; onRemove?: () => void }) {
  const { go } = useStore()
  return (
    <li className={onRemove ? 'pick-row' : undefined}>
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
        {!onRemove && <Icon name="next" size={18} className="chev" />}
      </button>
      {onRemove && (
        <button type="button" className="icon-btn" aria-label={`Remove ${e.name} from this list`} onClick={onRemove}>
          <Icon name="close" size={18} />
        </button>
      )}
    </li>
  )
}

export function Bookmarks({ kind: initial }: { kind?: Kind }) {
  const { entries, settings, saveSettings, go } = useStore()
  const [naming, setNaming] = useState(false)
  const [newName, setNewName] = useState('')
  const marked = entries.filter((e) => e.bookmarkedAt).sort((a, b) => (b.bookmarkedAt ?? 0) - (a.bookmarkedAt ?? 0))
  const sections = KINDS.filter((k) => marked.some((e) => e.kind === k.id))
  const [kind, setKind] = useState<Kind | 'all'>(initial && sections.some((k) => k.id === initial) ? initial : 'all')
  const shown = sections.filter((k) => kind === 'all' || k.id === kind)

  const row = (e: Entry) => <EntryRow key={e.id} e={e} />

  return (
    <div className="screen">
      <TopBar title="Bookmarks" />
      <h1>Bookmarks</h1>

      <section className="block" aria-label="Your lists">
        <div className="section-head">
          <h2>Your lists</h2>
          <button type="button" className="link-btn" onClick={() => setNaming(true)}>
            New list
          </button>
        </div>
        {settings.lists.length ? (
          <ul className="list">
            {settings.lists.map((l) => {
              const n = entries.filter((e) => e.lists?.includes(l.id)).length
              return (
                <li key={l.id}>
                  <button type="button" className="list-row" onClick={() => go({ name: 'list', id: l.id })}>
                    <span className="list-main">
                      <span className="list-name">{l.name}</span>
                      <span className="list-sub">{n === 1 ? '1 exercise' : `${n} exercises`}</span>
                    </span>
                    <Icon name="next" size={18} className="chev" />
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="muted small">Group exercises your own way, like "Morning mobility" or "Hip routine". Make a list here, or from the bookmark button on any exercise.</p>
        )}
      </section>
      <Sheet open={naming} onClose={() => setNaming(false)} title="New list">
        <form
          className="form"
          onSubmit={async (ev) => {
            ev.preventDefault()
            const clean = newName.trim()
            if (!clean) return
            const list = { id: uid(), name: clean, createdAt: Date.now() }
            await saveSettings({ lists: [...settings.lists, list] })
            setNewName('')
            setNaming(false)
            go({ name: 'list', id: list.id })
          }}
        >
          <div className="field">
            <label htmlFor="new-list">Name</label>
            <input id="new-list" value={newName} onChange={(ev) => setNewName(ev.target.value)} placeholder="Morning mobility" autoFocus enterKeyHint="done" />
          </div>
          <button type="submit" className="btn primary" disabled={!newName.trim()}>
            Create list
          </button>
        </form>
      </Sheet>

      <h2>By section</h2>
      {marked.length === 0 ? (
        <Empty
          title="Nothing bookmarked yet"
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

/** One named list: its exercises, rename and delete. */
export function ListScreen({ id }: { id: string }) {
  const { entries, settings, saveSettings, saveEntry, go, back, notify } = useStore()
  const list = settings.lists.find((l) => l.id === id)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(list?.name ?? '')
  const [deleting, setDeleting] = useState(false)
  if (!list) return <Empty title="This list was deleted" />
  const items = entries.filter((e) => e.lists?.includes(id)).sort((a, b) => a.name.localeCompare(b.name))
  const removeFrom = (e: Entry) => saveEntry({ ...e, lists: e.lists?.filter((x) => x !== id), updatedAt: Date.now() })

  return (
    <div className="screen">
      <TopBar
        sub="Bookmarks"
        title={list.name}
        right={
          <button type="button" className="icon-btn" aria-label="Rename list" onClick={() => (setName(list.name), setRenaming(true))}>
            <Icon name="edit" />
          </button>
        }
      />
      <h1>{list.name}</h1>
      {items.length ? (
        <ul className="list">
          {items.map((e) => (
            <EntryRow key={e.id} e={e} onRemove={() => removeFrom(e)} />
          ))}
        </ul>
      ) : (
        <Empty
          title="Empty list"
          body="Open an exercise, tap its bookmark button and pick this list."
          action={
            <button type="button" className="btn primary" onClick={() => go({ name: 'library' })}>
              Browse the library
            </button>
          }
        />
      )}
      <button type="button" className="btn danger-ghost" onClick={() => setDeleting(true)}>
        Delete list
      </button>

      <Sheet open={renaming} onClose={() => setRenaming(false)} title="Rename list">
        <form
          className="form"
          onSubmit={async (ev) => {
            ev.preventDefault()
            if (!name.trim()) return
            await saveSettings({ lists: settings.lists.map((l) => (l.id === id ? { ...l, name: name.trim() } : l)) })
            setRenaming(false)
          }}
        >
          <div className="field">
            <label htmlFor="list-name">Name</label>
            <input id="list-name" value={name} onChange={(ev) => setName(ev.target.value)} autoFocus enterKeyHint="done" />
          </div>
          <button type="submit" className="btn primary" disabled={!name.trim()}>
            Save name
          </button>
        </form>
      </Sheet>
      <Confirm
        open={deleting}
        title={`Delete "${list.name}"?`}
        body="Only the list goes. The exercises, their notes and bookmarks stay."
        action="Delete list"
        danger
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          for (const e of items) await removeFrom(e)
          await saveSettings({ lists: settings.lists.filter((l) => l.id !== id) })
          notify('List deleted')
          back()
        }}
      />
    </div>
  )
}
