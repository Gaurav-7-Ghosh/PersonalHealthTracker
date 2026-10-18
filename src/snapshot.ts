// Draws a finished workout as a PNG to share (WhatsApp and so on): date, name, totals, the body
// figure with the muscles worked, and every exercise with its sets.
import { drawBody, hostOf } from './components/BodyMap'
import { fmtSet } from './screens/EntryView'
import type { Entry, Session } from './types'
import { fmtDate, fmtDuration, fmtNum } from './util'

const W = 1080
const PAD = 64
const C = {
  bg: '#0e1311',
  surface: '#161d1a',
  raised: '#1e2723',
  line: '#2a352f',
  fg: '#eaf0ec',
  muted: '#93a39a',
  accent: '#b8f36b',
  onAccent: '#0e1311',
}
const DISPLAY = "'Bricolage Grotesque', 'Avenir Next Condensed', 'Helvetica Neue', system-ui, sans-serif"
const BODY = "'DM Sans', -apple-system, 'Segoe UI', system-ui, sans-serif"

export interface Totals {
  time: string
  sets: string
  volume: string
  setsLabel: string
  volumeLabel: string
}

export function sessionTotals(s: Session): Totals {
  const volume = s.items.reduce((v, i) => v + i.sets.reduce((w, x) => w + (x.weight ?? 0) * (x.reps ?? 0), 0), 0)
  const sets = s.items.reduce((n, i) => n + i.sets.length, 0)
  return {
    time: s.endedAt ? fmtDuration(s.endedAt - s.startedAt) : '-',
    setsLabel: s.hiit ? 'Rounds' : 'Sets',
    sets: s.hiit ? `${s.hiit.roundsDone} of ${s.hiit.rounds}` : String(sets),
    volumeLabel: s.hiit ? 'Intervals' : 'Volume',
    volume: s.hiit ? `${s.hiit.work}/${s.hiit.rest} s` : `${fmtNum(Math.round(volume))} kg`,
  }
}

/** Primary muscles light fully, secondary ones half; returns the names worked, primary first. */
function musclesWorked(s: Session, entry: (id: string) => Entry | undefined) {
  const level = new Map<string, number>()
  const primary: string[] = []
  const secondary: string[] = []
  for (const it of s.items) {
    if (!it.sets.length && !s.hiit) continue
    for (const m of entry(it.entryId)?.muscles ?? []) {
      const v = m.role === 'primary' ? 1 : m.role === 'secondary' ? 0.5 : 0
      if (!v) continue
      const host = hostOf(m.name)
      level.set(host, Math.max(level.get(host) ?? 0, v))
      ;(v === 1 ? primary : secondary).push(m.name)
    }
  }
  const p = [...new Set(primary)]
  return { level, primary: p, secondary: [...new Set(secondary)].filter((m) => !p.includes(m)) }
}

function wrap(g: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (line && g.measureText(next).width > width) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
  g.fillStyle = fill
  g.fill()
  if (stroke) {
    g.strokeStyle = stroke
    g.lineWidth = 2
    g.stroke()
  }
}

/** Lays the image out; with draw false it only measures, so the canvas can be sized first. */
function paint(g: CanvasRenderingContext2D, s: Session, entry: (id: string) => Entry | undefined, draw: boolean): number {
  const inner = W - PAD * 2
  let y = PAD
  const text = (t: string, x: number, yy: number, font: string, color: string, align: CanvasTextAlign = 'left') => {
    g.font = font
    if (!draw) return
    g.fillStyle = color
    g.textAlign = align
    g.textBaseline = 'alphabetic'
    g.fillText(t, x, yy)
  }
  if (draw) {
    g.fillStyle = C.bg
    g.fillRect(0, 0, W, g.canvas.height)
  }

  // Date and name.
  g.font = `600 28px ${BODY}`
  if (draw && 'letterSpacing' in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '3px'
  text(fmtDate(s.startedAt).toUpperCase(), PAD, y + 28, `600 28px ${BODY}`, C.accent)
  if ('letterSpacing' in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px'
  y += 28 + 18
  g.font = `700 76px ${DISPLAY}`
  for (const line of wrap(g, s.name, inner)) {
    y += 78
    text(line, PAD, y, `700 76px ${DISPLAY}`, C.fg)
  }
  y += 36

  // Totals.
  const t = sessionTotals(s)
  const stats: [string, string][] = [
    ['Time', t.time],
    [t.setsLabel, t.sets],
    [t.volumeLabel, t.volume],
  ]
  const gap = 18
  const sw = (inner - gap * 2) / 3
  stats.forEach(([label, value], i) => {
    const x = PAD + i * (sw + gap)
    if (draw) roundRect(g, x, y, sw, 136, 24, C.surface, C.line)
    text(label.toUpperCase(), x + 28, y + 46, `600 22px ${BODY}`, C.muted)
    text(value, x + 28, y + 106, `700 44px ${DISPLAY}`, C.fg)
  })
  y += 136 + 28

  // Body figure.
  const worked = musclesWorked(s, entry)
  const scale = 1.2
  const figH = 420 * scale
  const panelH = figH + 110
  if (draw) {
    roundRect(g, PAD, y, inner, panelH, 32, C.surface, C.line)
    ;(['front', 'back'] as const).forEach((side, i) => {
      const cx = W / 2 + (i === 0 ? -1 : 1) * 190
      g.save()
      g.translate(cx - 100 * scale, y + 30)
      g.scale(scale, scale)
      drawBody(g, side, worked.level, { base: C.raised, muted: C.muted, accent: C.accent })
      g.restore()
      text(side === 'front' ? 'Front' : 'Back', cx, y + 30 + figH + 50, `600 26px ${BODY}`, C.muted, 'center')
    })
  }
  y += panelH + 30

  // Muscles worked, as text too.
  if (worked.primary.length) {
    g.font = `500 30px ${BODY}`
    const line = `Worked: ${worked.primary.join(', ')}`
    for (const l of wrap(g, line, inner)) {
      y += 40
      text(l, PAD, y, `500 30px ${BODY}`, C.fg)
    }
    if (worked.secondary.length) {
      g.font = `400 26px ${BODY}`
      for (const l of wrap(g, `Also: ${worked.secondary.join(', ')}`, inner)) {
        y += 36
        text(l, PAD, y, `400 26px ${BODY}`, C.muted)
      }
    }
    y += 30
  }

  // Exercises and their sets.
  for (const it of s.items) {
    const e = entry(it.entryId)
    if (!it.sets.length && !s.hiit) continue
    y += 22
    if (draw) {
      g.strokeStyle = C.line
      g.lineWidth = 2
      g.beginPath()
      g.moveTo(PAD, y)
      g.lineTo(W - PAD, y)
      g.stroke()
    }
    y += 22
    g.font = `700 38px ${DISPLAY}`
    for (const l of wrap(g, e?.name ?? 'Deleted exercise', inner)) {
      y += 44
      text(l, PAD, y, `700 38px ${DISPLAY}`, C.fg)
    }
    if (it.swappedFrom) {
      y += 34
      text(`Swapped from ${entry(it.swappedFrom)?.name ?? 'another exercise'}`, PAD, y, `400 24px ${BODY}`, C.muted)
    }
    if (!it.sets.length) continue
    y += 20
    // Sets as pills: number, then "60 kg × 10".
    g.font = `600 28px ${BODY}`
    let x = PAD
    const ph = 58
    it.sets.forEach((set, i) => {
      const label = e ? fmtSet(set, e) : `${set.reps ?? 0} reps`
      g.font = `600 28px ${BODY}`
      const lw = g.measureText(label).width
      const nw = 40
      const w = nw + lw + 36
      if (x + w > W - PAD) {
        x = PAD
        y += ph + 12
      }
      if (draw) {
        roundRect(g, x, y, w, ph, ph / 2, C.raised, C.line)
        text(String(i + 1), x + 30, y + 39, `700 24px ${BODY}`, C.accent, 'center')
        text(label, x + nw + 10, y + 39, `600 28px ${BODY}`, C.fg)
      }
      x += w + 12
    })
    y += ph
  }

  y += 56
  text('Personal Health Tracker', W / 2, y, `500 24px ${BODY}`, C.muted, 'center')
  return y + PAD
}

export async function workoutImage(s: Session, entry: (id: string) => Entry | undefined): Promise<Blob> {
  try {
    await Promise.race([
      Promise.all([document.fonts.load(`700 76px 'Bricolage Grotesque'`), document.fonts.load(`600 28px 'DM Sans'`), document.fonts.load(`400 28px 'DM Sans'`)]),
      new Promise((r) => setTimeout(r, 1500)),
    ])
  } catch {
    /* system fonts are fine */
  }
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = 10
  const g = canvas.getContext('2d')!
  canvas.height = Math.ceil(paint(g, s, entry, false))
  paint(g, s, entry, true)
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
  if (!blob) throw new Error('Could not make the image')
  return blob
}
