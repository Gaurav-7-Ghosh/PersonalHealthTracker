// Form card editor: cues, and the photos with their order, position, notes,
// drawings and crop. Every change saves straight away.
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { CropEditor, InkEditor, PhotoView } from '../components/Ink'
import { Confirm, Empty, TopBar } from '../components/ui'
import * as db from '../db'
import { useStore } from '../store'
import { POSITIONS } from '../taxonomy'
import type { Entry, PhotoPosition, PhotoRef } from '../types'
import { cropImage, deletePhoto, resizeImage, savePhoto, uid } from '../util'

export function FormEdit({ id }: { id: string }) {
  const { entry, saveEntry, notify, back } = useStore()
  const e = entry(id)
  const [drawing, setDrawing] = useState<PhotoRef | null>(null)
  const [cropping, setCropping] = useState<PhotoRef | null>(null)
  const [removing, setRemoving] = useState<PhotoRef | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  // Latest entry for async handlers, so two quick edits don't overwrite each other.
  const latest = useRef(e)
  latest.current = e

  const save = async (patch: (x: Entry) => Partial<Entry>) => {
    const cur = latest.current
    if (!cur) return
    const next = { ...cur, ...patch(cur), updatedAt: Date.now() }
    latest.current = next
    await saveEntry(next)
  }

  const addImages = async (files: Blob[]) => {
    if (!files.length) return
    setBusy(true)
    try {
      const fresh: PhotoRef[] = []
      for (const f of files) {
        const pid = uid()
        await savePhoto(pid, await resizeImage(f))
        fresh.push({ id: pid, position: nextPosition([...(latest.current?.photos ?? []), ...fresh]) })
      }
      await save((x) => ({ photos: [...x.photos, ...fresh] }))
      notify(fresh.length === 1 ? 'Photo added' : `${fresh.length} photos added`)
    } finally {
      setBusy(false)
    }
  }

  // Cmd/Ctrl+V of a screenshot anywhere on this screen adds it.
  useEffect(() => {
    const onPaste = (ev: ClipboardEvent) => {
      const files = [...(ev.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'))
      if (!files.length) return
      ev.preventDefault()
      addImages(files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  const pasteButton = async () => {
    try {
      const items = await navigator.clipboard.read()
      const blobs: Blob[] = []
      for (const it of items) {
        const t = it.types.find((x) => x.startsWith('image/'))
        if (t) blobs.push(await it.getType(t))
      }
      if (blobs.length) await addImages(blobs)
      else notify('No image on the clipboard. Copy a screenshot first.')
    } catch {
      notify('Paste was blocked. Use Add photos, or press Ctrl+V / Cmd+V here.')
    }
  }

  if (!e) return <Empty title="This entry was deleted" />

  const setPhoto = (pid: string, patch: Partial<PhotoRef>) => save((x) => ({ photos: x.photos.map((p) => (p.id === pid ? { ...p, ...patch } : p)) }))
  const movePhoto = (i: number, d: number) =>
    save((x) => {
      const photos = [...x.photos]
      const j = i + d
      if (j < 0 || j >= photos.length) return {}
      ;[photos[i], photos[j]] = [photos[j], photos[i]]
      return { photos }
    })
  const setCues = (cues: string[]) => save(() => ({ cues }))

  const applyCrop = async (p: PhotoRef, r: { x: number; y: number; w: number; h: number }) => {
    const blob = await db.get<Blob>('photos', p.id)
    if (!blob) return
    const nid = uid()
    await savePhoto(nid, await cropImage(blob, r))
    const ink = p.ink && {
      w: r.w,
      h: r.h,
      marks: p.ink.marks.map((m) => (m.type === 'text' ? { ...m, x: m.x - r.x, y: m.y - r.y } : { ...m, pts: m.pts.map((v, k) => v - (k % 2 ? r.y : r.x)) })),
    }
    await save((x) => ({ photos: x.photos.map((q) => (q.id === p.id ? { ...q, id: nid, ink } : q)) }))
    await deletePhoto(p.id)
    setCropping(null)
    notify('Cropped')
  }

  const label = (p: PhotoRef) => POSITIONS.find((x) => x.id === p.position)?.label ?? 'Photo'

  return (
    <div className="screen form">
      <TopBar
        sub={e.name}
        title="Form card"
        right={
          <button type="button" className="btn small primary" onClick={back}>
            Done
          </button>
        }
      />
      <h1>Form card</h1>
      <p className="muted">Changes save as you go.</p>

      <section className="block">
        <h2>Cues</h2>
        <p className="muted small">The few things you tend to forget. Pasting several lines adds one cue per line. On iPhone, long-press the text in a screenshot to copy it.</p>
        <ol className="cue-edit">
          {e.cues.map((c, i) => (
            <li key={i}>
              <textarea
                aria-label={`Cue ${i + 1}`}
                rows={1}
                value={c}
                onChange={(x) => setCues(e.cues.map((v, k) => (k === i ? x.target.value : v)))}
                onPaste={(x) => {
                  const lines = x.clipboardData
                    .getData('text')
                    .split(/\r?\n/)
                    .map((l) => l.replace(/^[\s•\-–*☐☑✓✔\d.)]+/, '').trim())
                    .filter(Boolean)
                  if (lines.length < 2) return
                  x.preventDefault()
                  setCues([...e.cues.slice(0, i), ...(c.trim() ? [c] : []), ...lines, ...e.cues.slice(i + 1)])
                }}
              />
              <div className="cue-btns">
                <button type="button" className="icon-btn" aria-label={`Move cue ${i + 1} up`} disabled={i === 0} onClick={() => setCues(swap(e.cues, i, i - 1))}>
                  <Icon name="up" size={18} />
                </button>
                <button type="button" className="icon-btn" aria-label={`Remove cue ${i + 1}`} onClick={() => setCues(e.cues.filter((_, k) => k !== i))}>
                  <Icon name="trash" size={18} />
                </button>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className="btn ghost" onClick={() => setCues([...e.cues, ''])}>
          <Icon name="plus" size={18} /> Add cue
        </button>
      </section>

      <section className="block">
        <h2>Photos</h2>
        <p className="muted small">Screenshots from videos or OneNote, handwriting included. Draw on them here, crop away the slide text, and add a note per frame.</p>
        <div className="row-2">
          <button type="button" className="btn primary" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Icon name="camera" size={18} /> {busy ? 'Saving…' : 'Add photos'}
          </button>
          <button type="button" className="btn ghost" onClick={pasteButton} disabled={busy}>
            Paste screenshot
          </button>
        </div>
        <input ref={fileRef} id="fc-photos" type="file" accept="image/*" multiple hidden onChange={(x) => addImages([...(x.target.files ?? [])]).then(() => (x.target.value = ''))} />

        {e.photos.length === 0 && <p className="muted">No photos yet.</p>}
        <ol className="fc-photos">
          {e.photos.map((p, i) => (
            <li key={p.id} className="fc-photo" aria-label={`Photo ${i + 1}, ${label(p)}`}>
              <input
                aria-label={`Heading for photo ${i + 1}`}
                placeholder="Heading, e.g. Feet from the front"
                value={p.title ?? ''}
                onChange={(x) => setPhoto(p.id, { title: x.target.value })}
              />
              <PhotoView photo={p} alt={`${label(p)} photo`} maxHeight="40vh" />
              <div className="fc-photo-row">
                <select aria-label={`Position of photo ${i + 1}`} value={p.position} onChange={(x) => setPhoto(p.id, { position: x.target.value as PhotoPosition })}>
                  {POSITIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button type="button" className="icon-btn" aria-label={`Move photo ${i + 1} up`} disabled={i === 0} onClick={() => movePhoto(i, -1)}>
                  <Icon name="up" size={18} />
                </button>
                <button type="button" className="icon-btn" aria-label={`Move photo ${i + 1} down`} disabled={i === e.photos.length - 1} onClick={() => movePhoto(i, 1)}>
                  <Icon name="down" size={18} />
                </button>
                <button type="button" className="icon-btn" aria-label={`Remove photo ${i + 1}`} onClick={() => setRemoving(p)}>
                  <Icon name="trash" size={18} />
                </button>
              </div>
              <div className="fc-photo-row">
                <button type="button" className="btn small ghost" onClick={() => setDrawing(p)}>
                  <Icon name="edit" size={16} /> {p.ink?.marks.length ? 'Edit drawing' : 'Draw'}
                </button>
                <button type="button" className="btn small ghost" onClick={() => setCropping(p)}>
                  Crop
                </button>
              </div>
              <textarea
                aria-label={`Notes for photo ${i + 1}`}
                rows={2}
                placeholder="Notes for this frame, e.g. Push the hips back"
                value={p.caption ?? ''}
                onChange={(x) => setPhoto(p.id, { caption: x.target.value })}
              />
            </li>
          ))}
        </ol>
      </section>

      {drawing && (
        <InkEditor
          photo={drawing}
          onClose={() => setDrawing(null)}
          onSave={async (ink) => {
            await setPhoto(drawing.id, { ink: ink.marks.length ? ink : undefined })
            setDrawing(null)
            notify('Drawing saved')
          }}
        />
      )}
      {cropping && <CropEditor photo={cropping} onClose={() => setCropping(null)} onSave={(r) => applyCrop(cropping, r)} />}
      <Confirm
        open={!!removing}
        title="Remove this photo?"
        body="The photo and anything drawn on it are deleted from this device."
        action="Remove photo"
        danger
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return
          await save((x) => ({ photos: x.photos.filter((q) => q.id !== removing.id) }))
          await deletePhoto(removing.id)
        }}
      />
    </div>
  )
}

const swap = <T,>(a: T[], i: number, j: number) => {
  const b = [...a]
  ;[b[i], b[j]] = [b[j], b[i]]
  return b
}

function nextPosition(photos: PhotoRef[]): PhotoPosition {
  const used = new Set(photos.map((p) => p.position))
  return (['setup', 'start', 'mid', 'end'] as PhotoPosition[]).find((p) => !used.has(p)) ?? 'other'
}
