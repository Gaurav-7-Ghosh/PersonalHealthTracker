import { useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { LinkThumb } from '../components/LinkThumb'
import { Chip, Confirm, Photo, TopBar } from '../components/ui'
import { blankEntry, useStore } from '../store'
import { EQUIPMENT, KINDS, LINK_LABELS, MEASURES, NOTE_LABELS, PATTERNS, POSITIONS, REGIONS, defaultMeasure } from '../taxonomy'
import type { Entry, Kind, PhotoPosition, Role } from '../types'
import { deletePhoto, fetchLinkInfo, resizeImage, savePhoto, uid } from '../util'

const ROLES: (Role | undefined)[] = [undefined, 'primary', 'secondary', 'stabiliser']

export function EntryEdit({
  id,
  kind,
  region,
  muscle,
  equipment,
  returnBack,
}: {
  id?: string
  kind?: Kind
  region?: string
  muscle?: string
  equipment?: string
  returnBack?: boolean
}) {
  const { entry, saveEntry, deleteEntry, back, replace, go, notify } = useStore()
  const original = id ? entry(id) : undefined
  const [e, setE] = useState<Entry>(() => {
    if (original) return original
    const b = blankEntry(kind)
    return {
      ...b,
      regions: region && region !== 'Full body' ? [region] : b.regions,
      muscles: muscle ? [{ name: muscle, role: 'primary' }] : b.muscles,
      equipment: equipment ? [equipment] : b.equipment,
    }
  })
  const [added, setAdded] = useState<string[]>([])
  const [removed, setRemoved] = useState<string[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = (p: Partial<Entry>) => setE((x) => ({ ...x, ...p }))

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const muscleOptions = [...new Set(REGIONS.filter((r) => e.regions.includes(r.name)).flatMap((r) => r.muscles))]
  const roleOf = (m: string) => e.muscles.find((x) => x.name === m)?.role
  const cycleRole = (m: string) => {
    const next = ROLES[(ROLES.indexOf(roleOf(m)) + 1) % ROLES.length]
    set({ muscles: next ? [...e.muscles.filter((x) => x.name !== m), { name: m, role: next }] : e.muscles.filter((x) => x.name !== m) })
  }

  const nextPosition = (): PhotoPosition => {
    const used = new Set(e.photos.map((p) => p.position))
    return (['start', 'mid', 'end'] as PhotoPosition[]).find((p) => !used.has(p)) ?? 'other'
  }

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    const fresh: Entry['photos'] = []
    const used = new Set(e.photos.map((p) => p.position))
    for (const f of Array.from(files)) {
      const pid = uid()
      await savePhoto(pid, await resizeImage(f))
      const pos = (['start', 'mid', 'end'] as PhotoPosition[]).find((p) => !used.has(p)) ?? 'other'
      used.add(pos)
      fresh.push({ id: pid, position: pos })
    }
    setAdded((a) => [...a, ...fresh.map((p) => p.id)])
    setE((x) => ({ ...x, photos: [...x.photos, ...fresh] }))
    setBusy(false)
  }

  const cancel = async () => {
    for (const p of added) await deletePhoto(p)
    back()
  }

  const save = async () => {
    if (!e.name.trim()) {
      notify('Give it a name first')
      return
    }
    for (const p of removed) await deletePhoto(p)
    const clean: Entry = {
      ...e,
      name: e.name.trim(),
      cues: e.cues.map((c) => c.trim()).filter(Boolean),
      links: e.links.filter((l) => l.url.trim()),
      notes: e.notes.filter((n) => n.body.trim()),
    }
    await saveEntry(clean)
    notify('Saved')
    if (original || returnBack) back()
    else replace({ name: 'entry', id: clean.id })
  }

  return (
    <div className="screen form">
      <TopBar
        title={original ? 'Edit' : 'New entry'}
        onBack={cancel}
        right={
          <button type="button" className="btn small primary" onClick={save} disabled={busy}>
            Save
          </button>
        }
      />

      <div className="field">
        <label htmlFor="f-name">Name</label>
        <input id="f-name" value={e.name} placeholder="e.g. Incline Smith press" onChange={(x) => set({ name: x.target.value })} autoFocus={!original} />
      </div>

      <div className="field">
        <span className="label">Type</span>
        <div className="chips wrap">
          {KINDS.map((k) => (
            <Chip key={k.id} on={e.kind === k.id} onClick={() => set({ kind: k.id, measure: defaultMeasure(k.id) })}>
              {k.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="label">Log it as</span>
        <div className="chips wrap">
          {MEASURES.map((m) => (
            <Chip key={m.id} on={e.measure === m.id} onClick={() => set({ measure: m.id })}>
              {m.label}
            </Chip>
          ))}
        </div>
      </div>

      <section className="block">
        <h2>Form card</h2>
        <p className="muted small">Cues show first. Keep each one short.</p>
        <ol className="edit-list">
          {e.cues.map((c, i) => (
            <li key={i} className="edit-row">
              <input
                id={`f-cue-${i}`}
                aria-label={`Cue ${i + 1}`}
                value={c}
                placeholder="e.g. Arch upper back, blades pinned"
                onChange={(x) => set({ cues: e.cues.map((v, j) => (j === i ? x.target.value : v)) })}
              />
              <button type="button" className="icon-btn" aria-label={`Remove cue ${i + 1}`} onClick={() => set({ cues: e.cues.filter((_, j) => j !== i) })}>
                <Icon name="close" size={18} />
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="btn ghost small" onClick={() => set({ cues: [...e.cues, ''] })}>
          <Icon name="plus" size={16} /> Add cue
        </button>

        <div className="photo-grid">
          {e.photos.map((p) => (
            <div key={p.id} className="photo-cell">
              <Photo id={p.id} alt="" className="photo-sm" />
              <select
                aria-label="Position"
                value={p.position}
                onChange={(x) => set({ photos: e.photos.map((q) => (q.id === p.id ? { ...q, position: x.target.value as PhotoPosition } : q)) })}
              >
                {POSITIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                aria-label="Caption"
                placeholder="Caption"
                value={p.caption ?? ''}
                onChange={(x) => set({ photos: e.photos.map((q) => (q.id === p.id ? { ...q, caption: x.target.value } : q)) })}
              />
              <button
                type="button"
                className="icon-btn danger-ink"
                aria-label="Remove photo"
                onClick={() => {
                  set({ photos: e.photos.filter((q) => q.id !== p.id) })
                  setRemoved((r) => [...r, p.id])
                }}
              >
                <Icon name="trash" size={18} />
              </button>
            </div>
          ))}
          <button type="button" className="photo-add" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Icon name="camera" size={24} />
            {busy ? 'Saving…' : `Add photos (next: ${POSITIONS.find((p) => p.id === nextPosition())?.label})`}
          </button>
          <input ref={fileRef} id="f-photos" type="file" accept="image/*" multiple hidden onChange={(x) => addPhotos(x.target.files).then(() => (x.target.value = ''))} />
        </div>
      </section>

      <section className="block">
        <h2>Videos and links</h2>
        <datalist id="link-labels">
          {LINK_LABELS.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>
        {e.links.map((l, i) => (
          <div key={l.id} className="kv-edit">
            <input
              aria-label="Label"
              list="link-labels"
              placeholder="Label, e.g. Proper form"
              value={l.label}
              onChange={(x) => set({ links: e.links.map((q, j) => (j === i ? { ...q, label: x.target.value } : q)) })}
            />
            <input
              aria-label="Link"
              inputMode="url"
              placeholder="https://"
              value={l.url}
              onChange={(x) => set({ links: e.links.map((q, j) => (j === i ? { ...q, url: x.target.value } : q)) })}
              onBlur={async () => {
                if (!l.url || (l.title && l.thumb)) return
                const info = await fetchLinkInfo(l.url)
                if (info.title || info.thumb) setE((x) => ({ ...x, links: x.links.map((q) => (q.id === l.id ? { ...q, ...info } : q)) }))
              }}
            />
            <input
              aria-label="Title"
              placeholder="Title (so you recognise it offline)"
              value={l.title ?? ''}
              onChange={(x) => set({ links: e.links.map((q, j) => (j === i ? { ...q, title: x.target.value } : q)) })}
            />
            <div className="cover-row">
              <LinkThumb link={l} />
              <label className="btn small ghost">
                <Icon name="camera" size={16} /> {l.cover ? 'Change cover' : 'Add cover image'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  aria-label={`Cover image for link ${i + 1}`}
                  onChange={async (x) => {
                    const f = x.target.files?.[0]
                    x.target.value = ''
                    if (!f) return
                    const pid = uid()
                    await savePhoto(pid, await resizeImage(f, 640))
                    setAdded((a) => [...a, pid])
                    if (l.cover) setRemoved((r) => [...r, l.cover!])
                    setE((y) => ({ ...y, links: y.links.map((q) => (q.id === l.id ? { ...q, cover: pid } : q)) }))
                  }}
                />
              </label>
              {l.cover && (
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setRemoved((r) => [...r, l.cover!])
                    set({ links: e.links.map((q, j) => (j === i ? { ...q, cover: undefined } : q)) })
                  }}
                >
                  Remove cover
                </button>
              )}
            </div>
            <button
              type="button"
              className="link-btn danger-ink"
              onClick={() => {
                if (l.cover) setRemoved((r) => [...r, l.cover!])
                set({ links: e.links.filter((_, j) => j !== i) })
              }}
            >
              Remove link
            </button>
          </div>
        ))}
        <button type="button" className="btn ghost small" onClick={() => set({ links: [...e.links, { id: uid(), label: 'Proper form', url: '' }] })}>
          <Icon name="plus" size={16} /> Add link
        </button>
      </section>

      <section className="block">
        <h2>Notes</h2>
        <datalist id="note-labels">
          {NOTE_LABELS.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>
        {e.notes.map((n, i) => (
          <div key={n.id} className="kv-edit">
            <input
              aria-label="Label"
              list="note-labels"
              placeholder="Label, e.g. What to focus on"
              value={n.label}
              onChange={(x) => set({ notes: e.notes.map((q, j) => (j === i ? { ...q, label: x.target.value } : q)) })}
            />
            <textarea
              aria-label="Note"
              rows={3}
              placeholder="Paste from OneNote or type"
              value={n.body}
              onChange={(x) => set({ notes: e.notes.map((q, j) => (j === i ? { ...q, body: x.target.value } : q)) })}
            />
            <button type="button" className="link-btn danger-ink" onClick={() => set({ notes: e.notes.filter((_, j) => j !== i) })}>
              Remove note
            </button>
          </div>
        ))}
        <button type="button" className="btn ghost small" onClick={() => set({ notes: [...e.notes, { id: uid(), label: 'What to focus on', body: '' }] })}>
          <Icon name="plus" size={16} /> Add note
        </button>
      </section>

      <section className="block">
        <h2>Body and equipment</h2>
        <div className="field">
          <span className="label">Regions</span>
          <div className="chips wrap">
            {REGIONS.map((r) => (
              <Chip key={r.name} on={e.regions.includes(r.name)} onClick={() => set({ regions: toggle(e.regions, r.name) })}>
                {r.name}
              </Chip>
            ))}
          </div>
        </div>
        {muscleOptions.length > 0 && (
          <div className="field">
            <span className="label">Muscles (tap to cycle primary, secondary, stabiliser)</span>
            <div className="chips wrap">
              {muscleOptions.map((m) => {
                const r = roleOf(m)
                return (
                  <button key={m} type="button" className={'chip muscle-chip ' + (r ?? '')} onClick={() => cycleRole(m)} aria-label={`${m}: ${r ?? 'not used'}`}>
                    {m}
                    {r && <span className="role">{r[0].toUpperCase()}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <div className="field">
          <span className="label">Equipment</span>
          <div className="chips wrap">
            {EQUIPMENT.map((q) => (
              <Chip key={q} on={e.equipment.includes(q)} onClick={() => set({ equipment: toggle(e.equipment, q) })}>
                {q}
              </Chip>
            ))}
          </div>
        </div>
        {e.kind === 'strength' && (
          <>
            <div className="field">
              <label htmlFor="f-pattern">Movement pattern</label>
              <select id="f-pattern" value={e.pattern ?? ''} onChange={(x) => set({ pattern: x.target.value || undefined })}>
                <option value="">None</option>
                {PATTERNS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <label className="check">
              <input id="f-compound" type="checkbox" checked={!!e.compound} onChange={(x) => set({ compound: x.target.checked })} />
              Compound lift (several joints)
            </label>
          </>
        )}
      </section>

      {original && (
        <button type="button" className="btn danger-ghost" onClick={() => setConfirmDelete(true)}>
          Delete entry
        </button>
      )}
      <Confirm
        open={confirmDelete}
        title={`Delete ${e.name}?`}
        body="Its photos, links and notes are removed. Logged sets stay in your history."
        action="Delete"
        danger
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await deleteEntry(e.id)
          notify('Deleted')
          go({ name: 'library' })
        }}
      />
    </div>
  )
}
