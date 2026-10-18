// The offline revision card: key cues first, then the Setup/Start/Mid/End photos
// with their drawings and notes. Tap a photo to read it full screen.
import { useState } from 'react'
import { POSITIONS } from '../taxonomy'
import type { Entry, PhotoRef } from '../types'
import { Icon } from './Icon'
import { Lightbox, PhotoView } from './Ink'

/** "Setup", or "Setup 2" when there are several frames for one position. */
export function photoLabels(photos: PhotoRef[]) {
  const seen = new Map<string, number>()
  const total = new Map<string, number>()
  photos.forEach((p) => total.set(p.position, (total.get(p.position) ?? 0) + 1))
  return photos.map((p) => {
    const n = (seen.get(p.position) ?? 0) + 1
    seen.set(p.position, n)
    const base = POSITIONS.find((x) => x.id === p.position)?.label ?? 'Photo'
    return (total.get(p.position) ?? 0) > 1 ? `${base} ${n}` : base
  })
}

export function FormCard({ entry, compact, onAddPhotos, onEdit }: { entry: Entry; compact?: boolean; onAddPhotos?: () => void; onEdit?: () => void }) {
  const photos = entry.photos
  const labels = photoLabels(photos)
  const [i, setI] = useState(0)
  const [open, setOpen] = useState(false)
  const at = Math.min(i, photos.length - 1)
  const cur = photos[at]

  return (
    <section className={compact ? 'formcard compact' : 'formcard'} aria-label="Form card">
      {onEdit && (
        <div className="formcard-head">
          <span className="eyebrow">Form card</span>
          <button type="button" className="btn small ghost" onClick={onEdit}>
            <Icon name="edit" size={16} /> Edit form card
          </button>
        </div>
      )}
      {entry.cues.length > 0 ? (
        <ul className="cues">
          {entry.cues.map((c, n) => (
            <li key={n}>{c}</li>
          ))}
        </ul>
      ) : (
        !compact && <p className="muted">No cues yet. Add the 3 to 5 things you tend to forget.</p>
      )}

      {photos.length > 0 ? (
        <div className="photos">
          {cur?.title && <h3 className="photo-title">{cur.title}</h3>}
          <div
            className="photo-frame"
            onTouchStart={(e) => ((e.currentTarget as HTMLElement).dataset.x = String(e.touches[0].clientX))}
            onTouchEnd={(e) => {
              const x0 = Number((e.currentTarget as HTMLElement).dataset.x)
              const dx = e.changedTouches[0].clientX - x0
              if (Math.abs(dx) > 40) setI((v) => Math.max(0, Math.min(photos.length - 1, v + (dx < 0 ? 1 : -1))))
            }}
          >
            {cur && <PhotoView key={cur.id} photo={cur} alt={`${entry.name}, ${labels[at]}`} maxHeight={compact ? '38vh' : '48vh'} onOpen={() => setOpen(true)} />}
          </div>
          {cur?.caption && <p className="photo-note">{cur.caption}</p>}
          {photos.length > 1 && (
            <div className="photo-tabs" role="tablist" aria-label="Positions">
              {photos.map((p, n) => (
                <button key={p.id} type="button" role="tab" aria-selected={n === at} className={n === at ? 'on' : ''} onClick={() => setI(n)}>
                  {labels[n]}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        !compact &&
        onAddPhotos && (
          <button type="button" className="photo-empty" onClick={onAddPhotos}>
            Add Setup, Start, Mid and End photos
            <span className="muted">Screenshots from videos or OneNote work well, handwriting included</span>
          </button>
        )
      )}
      {open && cur && <Lightbox photos={photos} index={at} title={entry.name} label={(_, n) => labels[n]} onClose={() => setOpen(false)} />}
    </section>
  )
}
