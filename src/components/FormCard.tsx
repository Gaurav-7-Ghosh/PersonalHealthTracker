// The offline revision card: key cues first, then Setup/Start/Mid/End photos.
import { useState } from 'react'
import { POSITIONS } from '../taxonomy'
import type { Entry } from '../types'
import { Photo } from './ui'

const ORDER = POSITIONS.map((p) => p.id)

export function FormCard({ entry, compact, onAddPhotos }: { entry: Entry; compact?: boolean; onAddPhotos?: () => void }) {
  const photos = [...entry.photos].sort((a, b) => ORDER.indexOf(a.position) - ORDER.indexOf(b.position))
  const [i, setI] = useState(0)
  const cur = photos[Math.min(i, photos.length - 1)]
  const label = (p: (typeof photos)[number]) => POSITIONS.find((x) => x.id === p.position)?.label ?? 'Photo'

  return (
    <section className={compact ? 'formcard compact' : 'formcard'} aria-label="Form card">
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
          <div
            className="photo-frame"
            onTouchStart={(e) => ((e.currentTarget as HTMLElement).dataset.x = String(e.touches[0].clientX))}
            onTouchEnd={(e) => {
              const x0 = Number((e.currentTarget as HTMLElement).dataset.x)
              const dx = e.changedTouches[0].clientX - x0
              if (Math.abs(dx) > 40) setI((v) => Math.max(0, Math.min(photos.length - 1, v + (dx < 0 ? 1 : -1))))
            }}
          >
            {cur && <Photo id={cur.id} alt={`${entry.name}, ${label(cur)} position`} className="photo" />}
            {cur?.caption && <div className="photo-caption">{cur.caption}</div>}
          </div>
          <div className="photo-tabs" role="tablist" aria-label="Positions">
            {photos.map((p, n) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={n === i}
                className={n === i ? 'on' : ''}
                onClick={() => setI(n)}
              >
                {label(p)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        !compact &&
        onAddPhotos && (
          <button type="button" className="photo-empty" onClick={onAddPhotos}>
            Add Start, Mid and End photos
            <span className="muted">Screenshots from videos or OneNote work well</span>
          </button>
        )
      )}
    </section>
  )
}
