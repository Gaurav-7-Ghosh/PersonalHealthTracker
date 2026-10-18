import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { Confirm, TopBar } from '../components/ui'
import { blankEntry, useStore } from '../store'
import { LINK_LABELS, kindLabel, platformOf } from '../taxonomy'
import type { Entry } from '../types'
import { ago, extractUrl, fetchLinkInfo, uid } from '../util'

// Words in a link title that point at an existing entry.
function suggest(entries: Entry[], text: string): Entry[] {
  const t = text.toLowerCase()
  if (!t.trim()) return []
  return entries
    .map((e) => {
      const words = e.name
        .toLowerCase()
        .split(/[\s-]+/)
        .filter((w) => w.length > 2)
      const hits = words.filter((w) => t.includes(w)).length
      return { e, score: t.includes(e.name.toLowerCase()) ? 10 : hits / words.length }
    })
    .filter((x) => x.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.e)
}

export function Capture({ url: url0, title: title0, inboxId }: { url?: string; title?: string; inboxId?: string }) {
  const { entries, inbox, saveEntry, removeInbox, notify, go, replace } = useStore()
  const [url, setUrl] = useState(url0 ?? '')
  const [title, setTitle] = useState(title0 ?? '')
  const [thumb, setThumb] = useState<string>()
  const [label, setLabel] = useState('Proper form')
  const [q, setQ] = useState('')
  const [target, setTarget] = useState<Entry | null>(null)
  const [newName, setNewName] = useState('')
  const [clearAll, setClearAll] = useState(false)

  useEffect(() => {
    if (!url || title) return
    let live = true
    fetchLinkInfo(url).then((info) => {
      if (!live) return
      if (info.title) setTitle(info.title)
      if (info.thumb) setThumb(info.thumb)
    })
    return () => {
      live = false
    }
  }, [url])

  const suggestions = useMemo(() => suggest(entries, `${title} ${url}`), [entries, title, url])
  const results = useMemo(() => {
    const n = q.trim().toLowerCase()
    return n ? entries.filter((e) => e.name.toLowerCase().includes(n)).slice(0, 6) : []
  }, [entries, q])

  const reset = () => {
    setUrl('')
    setTitle('')
    setThumb(undefined)
    setTarget(null)
    setQ('')
    setNewName('')
  }

  const done = async (msg: string) => {
    if (inboxId) await removeInbox(inboxId)
    notify(msg)
    reset()
    if (inboxId) replace({ name: 'capture' })
  }

  const attach = async (e: Entry) => {
    await saveEntry({ ...e, links: [...e.links, { id: uid(), label: label.trim() || 'Links', url, title: title || undefined, thumb }] })
    await done(`Saved to ${e.name} › ${label}`)
  }

  const valid = /^https?:\/\//.test(url)

  return (
    <div className="screen form">
      <TopBar title="Save a link" />

      <div className="field">
        <label htmlFor="c-url">Link</label>
        <div className="input-row">
          <input
            id="c-url"
            inputMode="url"
            placeholder="Paste a YouTube or Instagram link"
            value={url}
            onChange={(x) => setUrl(extractUrl(x.target.value) ?? x.target.value)}
            onPaste={(x) => {
              const t = x.clipboardData.getData('text')
              const u = extractUrl(t)
              if (u) {
                x.preventDefault()
                setUrl(u)
                const rest = t.replace(u, '').trim()
                if (rest && !title) setTitle(rest)
              }
            }}
          />
        </div>
        {valid && <div className="muted small">{platformOf(url)}</div>}
      </div>

      {valid && (
        <>
          <div className="field">
            <label htmlFor="c-title">Title</label>
            <input id="c-title" placeholder="What is this video about?" value={title} onChange={(x) => setTitle(x.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="c-label">Label</label>
            <input id="c-label" list="cap-labels" value={label} onChange={(x) => setLabel(x.target.value)} />
            <datalist id="cap-labels">
              {LINK_LABELS.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
            <div className="chips wrap">
              {LINK_LABELS.slice(0, 4).map((l) => (
                <button key={l} type="button" className={label === l ? 'chip on' : 'chip'} onClick={() => setLabel(l)}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <section className="block">
            <h2>Save it under</h2>
            {target ? (
              <div className="card row-between">
                <span>
                  <span className="card-title">{target.name}</span>
                  <span className="muted small"> › {label}</span>
                </span>
                <button type="button" className="link-btn" onClick={() => setTarget(null)}>
                  Change
                </button>
              </div>
            ) : (
              <>
                {suggestions.length > 0 && (
                  <div className="chips wrap">
                    {suggestions.map((e) => (
                      <button key={e.id} type="button" className="chip" onClick={() => setTarget(e)}>
                        {e.name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="search">
                  <Icon name="search" />
                  <input id="c-search" aria-label="Find an exercise" placeholder="Find an exercise or recipe" value={q} onChange={(x) => setQ(x.target.value)} />
                </div>
                <ul className="list compact">
                  {results.map((e) => (
                    <li key={e.id}>
                      <button type="button" className="list-row" onClick={() => setTarget(e)}>
                        <span className="list-main">
                          <span className="list-name">{e.name}</span>
                          <span className="list-sub">{kindLabel(e.kind)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="input-row">
                  <input id="c-new" aria-label="New entry name" placeholder="Or create a new entry" value={newName} onChange={(x) => setNewName(x.target.value)} />
                  <button
                    type="button"
                    className="btn small"
                    disabled={!newName.trim()}
                    onClick={async () => {
                      const e = { ...blankEntry('strength'), name: newName.trim() }
                      await saveEntry(e)
                      setTarget(e)
                    }}
                  >
                    Create
                  </button>
                </div>
              </>
            )}
          </section>

          <div className="save-one">
            <button type="button" className="btn primary" disabled={!target} onClick={() => target && attach(target)}>
              Save
            </button>
          </div>
        </>
      )}

      {/* The inbox is retired; links saved there before stay listed until they're sorted or deleted. */}
      {inbox.length > 0 && (
        <section className="block">
          <div className="section-head">
            <h2>Unsorted links</h2>
            {inbox.length > 0 && (
              <button type="button" className="link-btn" onClick={() => setClearAll(true)}>
                Clear all
              </button>
            )}
          </div>
          {inbox.length ? (
            <ul className="list compact">
              {inbox.map((i) => (
                <li key={i.id} className="inbox-row">
                  <button type="button" className="list-row" onClick={() => go({ name: 'capture', url: i.url, title: i.title, inboxId: i.id })}>
                    <span className="list-main">
                      <span className="list-name clamp">{i.title || i.url}</span>
                      <span className="list-sub">
                        {platformOf(i.url)} · {ago(i.createdAt)}
                      </span>
                    </span>
                    <span className="link-btn">Sort</span>
                  </button>
                  <button type="button" className="icon-btn" aria-label="Delete link" onClick={() => removeInbox(i.id)}>
                    <Icon name="trash" size={18} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      )}

      <Confirm
        open={clearAll}
        title="Delete all unsorted links?"
        body={`${inbox.length} unsorted links will be deleted.`}
        action="Delete all"
        danger
        onClose={() => setClearAll(false)}
        onConfirm={async () => {
          for (const i of inbox) await removeInbox(i.id)
        }}
      />
    </div>
  )
}
