// Photos with drawings on top: the read-only view, a full-screen zoom view,
// and the editors for drawing and cropping. Drawings are stored as shapes in
// the photo's pixel space, so they stay sharp and can be edited later.
import { useEffect, useRef, useState } from 'react'
import type { Ink, InkMark, PhotoRef } from '../types'
import { photoUrl } from '../util'
import { Icon } from './Icon'

export const INK_COLORS = [
  { id: '#2f6bff', label: 'Blue' },
  { id: '#ff4d4d', label: 'Red' },
  { id: '#ffd23f', label: 'Yellow' },
  { id: '#c4f36a', label: 'Lime' },
  { id: '#ffffff', label: 'White' },
]

function usePhoto(id: string) {
  const [src, setSrc] = useState<string>()
  const [size, setSize] = useState<{ w: number; h: number }>()
  useEffect(() => {
    let live = true
    setSize(undefined)
    photoUrl(id).then((u) => {
      if (!live || !u) return
      setSrc(u)
      const i = new Image()
      i.onload = () => live && setSize({ w: i.naturalWidth, h: i.naturalHeight })
      i.src = u
    })
    return () => {
      live = false
    }
  }, [id])
  return { src, size }
}

const unit = (ink: { w: number; h: number }) => Math.max(ink.w, ink.h) / 220

function arrowHead(pts: number[], u: number) {
  const [x1, y1, x2, y2] = pts.slice(-4)
  const a = Math.atan2(y2 - y1, x2 - x1)
  const l = u * 7
  const p = (d: number) => `${x2 - l * Math.cos(a + d)},${y2 - l * Math.sin(a + d)}`
  return `${x2},${y2} ${p(0.45)} ${p(-0.45)}`
}

export function InkMarks({ ink }: { ink: Ink }) {
  const u = unit(ink)
  return (
    <>
      {ink.marks.map((m, i) => {
        if (m.type === 'text')
          return (
            <text key={i} x={m.x} y={m.y} fill={m.color} fontSize={u * 7.5} className="ink-text">
              {m.text}
            </text>
          )
        const d = 'M' + m.pts.reduce<string[]>((a, v, j) => (j % 2 ? a : [...a, `${v} ${m.pts[j + 1]}`]), []).join('L')
        return (
          <g key={i} stroke={m.color} fill="none" strokeWidth={u * 1.6} strokeLinecap="round" strokeLinejoin="round">
            <path d={d} />
            {m.type === 'arrow' && m.pts.length >= 4 && <polygon points={arrowHead(m.pts, u)} fill={m.color} />}
          </g>
        )
      })}
    </>
  )
}

/** A photo with its drawings, sized to the photo's own shape. */
export function PhotoView({ photo, alt, maxHeight = '60vh', onOpen }: { photo: PhotoRef; alt: string; maxHeight?: string; onOpen?: () => void }) {
  const { src, size } = usePhoto(photo.id)
  if (!src || !size) return <div className="photo-ph inkwrap-ph" />
  const ink = photo.ink
  const body = (
    <div className="inkwrap" style={{ aspectRatio: `${size.w} / ${size.h}`, width: `min(100%, calc(${maxHeight} * ${size.w / size.h}))` }}>
      <img src={src} alt={alt} draggable={false} />
      {ink && ink.marks.length > 0 && (
        <svg viewBox={`0 0 ${ink.w} ${ink.h}`} preserveAspectRatio="none" aria-hidden="true">
          <InkMarks ink={ink} />
        </svg>
      )}
    </div>
  )
  return onOpen ? (
    <button type="button" className="inkwrap-btn" onClick={onOpen} aria-label={`${alt}. Open full screen`}>
      {body}
    </button>
  ) : (
    body
  )
}

/** Full-screen viewer with zoom, for reading handwriting at the gym. */
export function Lightbox({ photos, index, title, label, onClose }: { photos: PhotoRef[]; index: number; title: string; label: (p: PhotoRef, i: number) => string; onClose: () => void }) {
  const [i, setI] = useState(index)
  const [zoom, setZoom] = useState(1)
  const p = photos[i]
  const step = (d: number) => {
    setZoom(1)
    setI((v) => Math.max(0, Math.min(photos.length - 1, v + d)))
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  if (!p) return null
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${title}, ${label(p, i)}`}>
      <div className="lightbox-top">
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
          <Icon name="close" />
        </button>
        <div className="lightbox-title">
          <div className="eyebrow">{title}</div>
          <div>
            {label(p, i)} · {i + 1} of {photos.length}
          </div>
        </div>
        <button type="button" className="btn small ghost" onClick={() => setZoom((z) => (z >= 3 ? 1 : z + 1))} aria-label="Zoom">
          {zoom}×
        </button>
      </div>
      <div
        className="lightbox-stage"
        onTouchStart={(e) => ((e.currentTarget as HTMLElement).dataset.x = String(e.touches[0].clientX))}
        onTouchEnd={(e) => {
          if (zoom > 1) return
          const dx = e.changedTouches[0].clientX - Number((e.currentTarget as HTMLElement).dataset.x)
          if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1)
        }}
      >
        <div style={{ width: `${zoom * 100}%`, margin: 'auto' }}>
          <PhotoView photo={p} alt={label(p, i)} maxHeight={zoom > 1 ? '1000vh' : '72dvh'} />
        </div>
      </div>
      {p.caption && <div className="lightbox-note">{p.caption}</div>}
      <div className="lightbox-nav">
        <button type="button" className="btn ghost" onClick={() => step(-1)} disabled={i === 0} aria-label="Previous photo">
          <Icon name="back" />
        </button>
        <button type="button" className="btn ghost" onClick={() => step(1)} disabled={i === photos.length - 1} aria-label="Next photo">
          <Icon name="next" />
        </button>
      </div>
    </div>
  )
}

type Tool = 'pen' | 'arrow' | 'line' | 'text'
const TOOLS: { id: Tool; label: string }[] = [
  { id: 'pen', label: 'Pen' },
  { id: 'arrow', label: 'Arrow' },
  { id: 'line', label: 'Line' },
  { id: 'text', label: 'Text' },
]

function toImage(e: React.PointerEvent, el: Element, w: number, h: number) {
  const r = el.getBoundingClientRect()
  return [Math.round(((e.clientX - r.left) / r.width) * w), Math.round(((e.clientY - r.top) / r.height) * h)]
}

/** Draw lines, arrows and notes on a photo, like ink in OneNote. */
export function InkEditor({ photo, onSave, onClose }: { photo: PhotoRef; onSave: (ink: Ink) => void; onClose: () => void }) {
  const { src, size } = usePhoto(photo.id)
  const [marks, setMarks] = useState<InkMark[]>(photo.ink?.marks ?? [])
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState(INK_COLORS[0].id)
  const [draft, setDraft] = useState<InkMark | null>(null)
  const [textAt, setTextAt] = useState<{ x: number; y: number } | null>(null)
  const [text, setText] = useState('')
  const svgRef = useRef<SVGSVGElement>(null)
  // Older drawings keep their own coordinate space; new ones use the photo's.
  const space = photo.ink && size && (photo.ink.w !== size.w || photo.ink.h !== size.h) ? { w: photo.ink.w, h: photo.ink.h } : size

  if (!src || !size || !space) return <div className="ink-editor" />
  const { w, h } = space

  const down = (e: React.PointerEvent) => {
    const [x, y] = toImage(e, svgRef.current!, w, h)
    if (tool === 'text') {
      setTextAt({ x, y })
      return
    }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    setDraft({ type: tool, color, pts: [x, y, x, y] })
  }
  const move = (e: React.PointerEvent) => {
    if (!draft || draft.type === 'text') return
    const [x, y] = toImage(e, svgRef.current!, w, h)
    setDraft({ ...draft, pts: draft.type === 'pen' ? [...draft.pts, x, y] : [draft.pts[0], draft.pts[1], x, y] })
  }
  const up = () => {
    if (draft && draft.type !== 'text') {
      const [x1, y1] = draft.pts
      const [x2, y2] = draft.pts.slice(-2)
      if (Math.hypot(x2 - x1, y2 - y1) > 3 || draft.pts.length > 6) setMarks((m) => [...m, draft])
    }
    setDraft(null)
  }
  const addText = () => {
    if (textAt && text.trim()) setMarks((m) => [...m, { type: 'text', color, x: textAt.x, y: textAt.y, text: text.trim() }])
    setTextAt(null)
    setText('')
  }

  return (
    <div className="ink-editor" role="dialog" aria-modal="true" aria-label="Draw on photo">
      <div className="lightbox-top">
        <button type="button" className="btn small ghost" onClick={onClose}>
          Cancel
        </button>
        <div className="lightbox-title">Draw on photo</div>
        <button type="button" className="btn small primary" onClick={() => onSave({ w, h, marks })}>
          Save
        </button>
      </div>
      <div className="ink-stage">
        <div className="inkwrap" style={{ aspectRatio: `${w} / ${h}`, width: `min(100%, calc(64dvh * ${w / h}))` }}>
          <img src={src} alt="" draggable={false} />
          <svg
            ref={svgRef}
            viewBox={`0 0 ${w} ${h}`}
            preserveAspectRatio="none"
            className="ink-input"
            data-testid="ink-canvas"
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
          >
            <InkMarks ink={{ w, h, marks: draft ? [...marks, draft] : marks }} />
            {textAt && <circle cx={textAt.x} cy={textAt.y} r={unit({ w, h }) * 3} fill={color} />}
          </svg>
        </div>
      </div>
      <div className="ink-tools">
        {textAt ? (
          <form
            className="ink-text-row"
            onSubmit={(e) => {
              e.preventDefault()
              addText()
            }}
          >
            <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a note, e.g. Neutral back" aria-label="Note text" enterKeyHint="done" />
            <button type="submit" className="btn small primary">
              Add
            </button>
          </form>
        ) : (
          <div className="segmented" role="tablist" aria-label="Tool">
            {TOOLS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tool === t.id} onClick={() => setTool(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        )}
        <div className="ink-row">
          <div className="ink-colors" role="radiogroup" aria-label="Colour">
            {INK_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={color === c.id}
                aria-label={c.label}
                className={color === c.id ? 'swatch on' : 'swatch'}
                style={{ background: c.id }}
                onClick={() => setColor(c.id)}
              />
            ))}
          </div>
          <button type="button" className="btn small ghost" onClick={() => setMarks((m) => m.slice(0, -1))} disabled={!marks.length}>
            Undo
          </button>
          <button type="button" className="btn small ghost" onClick={() => setMarks([])} disabled={!marks.length}>
            Clear
          </button>
        </div>
        <p className="muted small center">{tool === 'text' ? 'Tap where the note should start.' : 'Drag on the photo to draw.'}</p>
      </div>
    </div>
  )
}

/** Drag a box over the part of the screenshot to keep. */
export function CropEditor({ photo, onSave, onClose }: { photo: PhotoRef; onSave: (r: { x: number; y: number; w: number; h: number }) => void; onClose: () => void }) {
  const { src, size } = usePhoto(photo.id)
  const [box, setBox] = useState<number[] | null>(null)
  const [drag, setDrag] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  if (!src || !size) return <div className="ink-editor" />
  const { w, h } = size
  const clamp = ([x, y]: number[]) => [Math.max(0, Math.min(w, x)), Math.max(0, Math.min(h, y))]
  const rect = box && { x: Math.min(box[0], box[2]), y: Math.min(box[1], box[3]), w: Math.abs(box[2] - box[0]), h: Math.abs(box[3] - box[1]) }
  const ok = rect && rect.w > 20 && rect.h > 20

  return (
    <div className="ink-editor" role="dialog" aria-modal="true" aria-label="Crop photo">
      <div className="lightbox-top">
        <button type="button" className="btn small ghost" onClick={onClose}>
          Cancel
        </button>
        <div className="lightbox-title">Crop</div>
        <button type="button" className="btn small primary" disabled={!ok} onClick={() => rect && onSave(rect)}>
          Apply
        </button>
      </div>
      <div className="ink-stage">
        <div className="inkwrap" style={{ aspectRatio: `${w} / ${h}`, width: `min(100%, calc(64dvh * ${w / h}))` }}>
          <img src={src} alt="" draggable={false} />
          <svg
            ref={svgRef}
            viewBox={`0 0 ${w} ${h}`}
            preserveAspectRatio="none"
            className="ink-input"
            data-testid="crop-canvas"
            onPointerDown={(e) => {
              ;(e.target as Element).setPointerCapture?.(e.pointerId)
              const p = clamp(toImage(e, svgRef.current!, w, h))
              setBox([...p, ...p])
              setDrag(true)
            }}
            onPointerMove={(e) => drag && box && setBox([box[0], box[1], ...clamp(toImage(e, svgRef.current!, w, h))])}
            onPointerUp={() => setDrag(false)}
          >
            {rect && (
              <>
                <path className="crop-shade" fillRule="evenodd" d={`M0 0H${w}V${h}H0Z M${rect.x} ${rect.y}h${rect.w}v${rect.h}h${-rect.w}Z`} />
                <rect className="crop-box" x={rect.x} y={rect.y} width={rect.w} height={rect.h} strokeWidth={unit(size) * 1.2} />
              </>
            )}
          </svg>
        </div>
      </div>
      <p className="muted small center">Drag across the part to keep, for example just the video frame.</p>
    </div>
  )
}
