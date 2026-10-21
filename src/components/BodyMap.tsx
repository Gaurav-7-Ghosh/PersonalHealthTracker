// Front and back anatomy figure with one tappable, coloured zone per muscle.
// Drawn on a 200 x 420 grid. Shapes are written for the viewer's left half and
// mirrored, and both halves sit in one <g> so they act as a single target.
// Colours run warm to cool from the neck down, so neighbouring groups stand apart.
import { REGIONS } from '../taxonomy'

export type Side = 'front' | 'back'
type Pt = [number, number]
type Zone = { muscle: string; d: string; color: string }

// Catmull-Rom through the points, as cubic Béziers. Closed shapes wrap around.
function smooth(pts: Pt[], closed = false) {
  const n = pts.length
  const at = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))])
  let d = `M${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`
  }
  return d + (closed ? 'Z' : '')
}
const blob = (pts: Pt[]) => smooth(pts, true)
const mirrorPts = (pts: Pt[]) => pts.map(([x, y]) => [200 - x, y] as Pt)
const whole = (half: Pt[]) => smooth([...half, ...mirrorPts(half).reverse()]) + 'Z'

// Left half of the body, chin down the neck, out along the arm and hand, then down the leg to the crotch.
const OUTLINE: Pt[] = [
  [93, 40], [92, 50], [84, 56], [74, 60], [64, 63], [56, 68], [51, 77], [49, 90], [48, 104], [47, 118],
  [45, 130], [42, 142], [39, 160], [37, 178], [36, 190], [33, 198], [32, 210], [35, 222], [40, 226], [44, 221],
  [45, 208], [47, 196], [50, 180], [54, 160], [57, 143], [60, 130], [62, 116], [64, 104], [66, 99], [68, 110],
  [71, 128], [73, 146], [71, 160], [69, 174], [68, 192], [69, 214], [71, 240], [74, 262], [76, 282], [74, 296],
  [72, 314], [74, 334], [77, 356], [80, 376], [79, 388], [76, 398], [80, 405], [90, 406], [96, 403], [95, 392],
  [94, 380], [93, 358], [94, 336], [95, 316], [93, 298], [94, 284], [96, 262], [97, 236], [98, 218], [100, 210],
]
const SILHOUETTE = whole(OUTLINE)
const HEAD = whole([[100, 9], [91, 11], [86, 20], [86, 32], [90, 41], [96, 46], [100, 47]])
const EAR = blob([[87, 25], [84, 25], [83, 30], [85, 35], [88, 34]])

const RED = '#e5484d'
const VERMILION = '#f0613a'
const ORANGE = '#f7852e'
const AMBER = '#f5a524'
const YELLOW = '#f2c418'
const LIME = '#8cc63f'
const TEAL = '#1fa88e'
const AZURE = '#2196d3'
const BLUE = '#3b6fe0'
const INDIGO = '#5b4fd8'
const VIOLET = '#8746d2'
const MAGENTA = '#b83ec2'

const SIDE_DELT: Zone = { muscle: 'Side delt', color: VERMILION, d: blob([[62, 64], [55, 69], [51, 78], [50, 90], [53, 98], [56, 88], [58, 75]]) }
const FOREARMS: Zone = { muscle: 'Forearms', color: LIME, d: blob([[50, 136], [44, 147], [40, 164], [38, 184], [46, 186], [51, 170], [56, 152], [58, 138]]) }

const FRONT: Zone[] = [
  { muscle: 'Neck flexors', color: RED, d: blob([[93, 40], [96, 45], [99, 56], [97, 59], [93, 50]]) },
  { muscle: 'Upper traps', color: RED, d: blob([[91, 48], [91, 55], [84, 59], [72, 62], [81, 55]]) },
  SIDE_DELT,
  { muscle: 'Front delt', color: VERMILION, d: blob([[72, 62], [64, 64], [59, 72], [57, 84], [58, 96], [63, 92], [67, 80], [73, 70], [78, 64]]) },
  { muscle: 'Upper chest', color: ORANGE, d: blob([[98, 62], [86, 62], [78, 65], [72, 72], [70, 78], [98, 78]]) },
  { muscle: 'Mid chest', color: ORANGE, d: blob([[98, 80], [70, 80], [68, 88], [70, 95], [98, 94]]) },
  { muscle: 'Lower chest', color: ORANGE, d: blob([[98, 96], [71, 97], [76, 104], [86, 108], [98, 106]]) },
  { muscle: 'Serratus anterior', color: AMBER, d: blob([[68, 100], [73, 103], [75, 112], [72, 120], [68, 112]]) },
  { muscle: 'Biceps', color: YELLOW, d: blob([[59, 98], [52, 104], [49, 116], [50, 128], [55, 134], [61, 128], [63, 112]]) },
  FOREARMS,
  { muscle: 'Upper abs', color: TEAL, d: blob([[98, 110], [89, 110], [87, 122], [88, 134], [98, 134]]) },
  { muscle: 'Lower abs', color: TEAL, d: blob([[98, 137], [88, 137], [88, 152], [91, 166], [98, 176]]) },
  { muscle: 'Obliques', color: TEAL, d: blob([[85, 110], [76, 112], [73, 126], [73, 146], [77, 160], [86, 168], [85, 140]]) },
  { muscle: 'Hip flexors', color: AZURE, d: blob([[75, 164], [86, 172], [92, 186], [89, 196], [80, 190], [73, 176]]) },
  { muscle: 'Adductors', color: BLUE, d: blob([[95, 194], [99, 204], [99, 230], [95, 250], [93, 228], [92, 208]]) },
  { muscle: 'Quads', color: INDIGO, d: blob([[72, 184], [69, 206], [71, 236], [75, 262], [82, 278], [90, 276], [94, 256], [93, 228], [88, 204], [79, 190]]) },
  { muscle: 'Tibialis', color: VIOLET, d: blob([[75, 292], [72, 314], [75, 340], [80, 356], [83, 330], [85, 296]]) },
  { muscle: 'Calves', color: MAGENTA, d: blob([[87, 294], [94, 306], [94, 332], [90, 344], [86, 320]]) },
]

const BACK: Zone[] = [
  { muscle: 'Upper traps', color: RED, d: blob([[99, 44], [93, 46], [91, 55], [80, 59], [70, 63], [84, 70], [99, 82]]) },
  SIDE_DELT,
  { muscle: 'Rear delt', color: VERMILION, d: blob([[70, 63], [63, 65], [58, 74], [57, 88], [60, 96], [65, 86], [70, 74], [74, 66]]) },
  { muscle: 'Mid back', color: ORANGE, d: blob([[99, 84], [80, 70], [74, 66], [76, 80], [86, 92], [99, 100]]) },
  { muscle: 'Lower traps', color: AMBER, d: blob([[99, 102], [86, 94], [90, 110], [99, 128]]) },
  { muscle: 'Lats', color: ORANGE, d: blob([[76, 84], [70, 96], [70, 116], [74, 136], [84, 152], [92, 140], [90, 118], [86, 98]]) },
  { muscle: 'Triceps', color: YELLOW, d: blob([[59, 98], [52, 104], [49, 116], [50, 128], [55, 134], [61, 128], [63, 112]]) },
  FOREARMS,
  { muscle: 'Lower back', color: TEAL, d: blob([[99, 130], [92, 124], [90, 144], [91, 164], [99, 168]]) },
  { muscle: 'Glute med', color: AZURE, d: blob([[71, 160], [68, 172], [70, 184], [78, 176], [88, 170], [86, 162]]) },
  { muscle: 'Glute max', color: BLUE, d: blob([[99, 172], [88, 172], [76, 182], [72, 198], [78, 212], [90, 216], [99, 212]]) },
  { muscle: 'Hamstrings', color: VIOLET, d: blob([[72, 218], [70, 244], [74, 270], [80, 282], [86, 274], [92, 280], [96, 266], [97, 244], [97, 222]]) },
  { muscle: 'Calves', color: MAGENTA, d: blob([[75, 294], [71, 312], [73, 334], [80, 346], [87, 342], [92, 326], [93, 306], [89, 294]]) },
]

const ZONES: Record<Side, Zone[]> = { front: FRONT, back: BACK }

// Muscles with no shape of their own light up the nearest one.
const HOST: Record<string, string> = {
  'Pec minor': 'Upper chest',
  'Rotator cuff': 'Rear delt',
  'Deep core': 'Lower abs',
  'Thoracic spine': 'Mid back',
  Piriformis: 'Glute max',
  Ankle: 'Calves',
  'Levator scapulae': 'Upper traps',
  Brachialis: 'Biceps',
}
export const hostOf = (m: string) => HOST[m] ?? m
export const isDrawn = (m: string) => FRONT.some((z) => z.muscle === m) || BACK.some((z) => z.muscle === m)

/** Sides that show any of these muscles, front first. */
export function sidesFor(muscles: string[]): Side[] {
  const hosts = muscles.map(hostOf)
  return (['front', 'back'] as Side[]).filter((s) => ZONES[s].some((z) => hosts.includes(z.muscle)))
}
/** The side where a muscle mostly lives; back muscles, hamstrings and calves show from behind. */
export function sideOf(m: string): Side {
  const h = hostOf(m)
  return BACK.some((z) => z.muscle === h) && (h === 'Calves' || !FRONT.some((z) => z.muscle === h)) ? 'back' : 'front'
}
export const regionMuscles = (region: string) => REGIONS.find((r) => r.name === region)?.muscles ?? []

const MIRROR = 'translate(200 0) scale(-1 1)'

export function BodyMap({
  side,
  onPick,
  highlight = [],
  only,
  className = 'bodymap',
  label,
}: {
  side: Side
  onPick?: (muscle: string) => void
  /** Muscles to pick out; the rest are greyed out. */
  highlight?: string[]
  /** When set, only these muscles can be tapped; the rest are greyed out. */
  only?: string[]
  className?: string
  label?: string
}) {
  const lit = new Set(highlight.map(hostOf))
  const allowed = only && new Set(only.map(hostOf))
  return (
    <svg className={className} viewBox="0 0 200 420" role="group" aria-label={label ?? `${side === 'front' ? 'Front' : 'Back'} of the body`}>
      <g className="body-base">
        <path d={SILHOUETTE} />
        <path d={HEAD} />
        <path d={EAR} />
        <path d={EAR} transform={MIRROR} />
      </g>
      {ZONES[side].map((z) => {
        const off = (allowed && !allowed.has(z.muscle)) || (lit.size > 0 && !lit.has(z.muscle))
        const tappable = onPick && !(allowed && !allowed.has(z.muscle))
        return (
          <g
            key={z.muscle}
            className={'zone' + (lit.has(z.muscle) ? ' on' : '') + (off ? ' off' : '') + (tappable ? ' tap' : '')}
            data-muscle={z.muscle}
            fill={z.color}
            role={tappable ? 'button' : undefined}
            aria-label={tappable ? z.muscle : undefined}
            tabIndex={tappable ? 0 : undefined}
            onClick={tappable ? () => onPick(z.muscle) : undefined}
            onKeyDown={tappable ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onPick(z.muscle)) : undefined}
          >
            <title>{z.muscle}</title>
            <path d={z.d} />
            <path d={z.d} transform={MIRROR} />
          </g>
        )
      })}
    </svg>
  )
}

/** Draws one side of the figure onto a canvas (for the shareable workout image). level: 1 primary, 0.5 secondary. */
export function drawBody(g: CanvasRenderingContext2D, side: Side, level: Map<string, number>, colors: { base: string; muted: string; line: string }) {
  g.save()
  g.fillStyle = colors.base
  g.strokeStyle = colors.line
  g.lineWidth = 1
  g.lineJoin = 'round'
  for (const d of [SILHOUETTE, HEAD]) {
    g.fill(new Path2D(d))
    g.stroke(new Path2D(d))
  }
  for (const z of ZONES[side]) {
    const v = level.get(z.muscle) ?? 0
    const p = new Path2D(z.d)
    for (const mirrored of [false, true]) {
      g.save()
      if (mirrored) g.setTransform(g.getTransform().translate(200, 0).scale(-1, 1))
      g.globalAlpha = v ? 0.45 + 0.55 * v : 0.2
      g.fillStyle = v ? z.color : colors.muted
      g.fill(p)
      g.globalAlpha = 1
      g.strokeStyle = colors.base
      g.lineWidth = 1.2
      g.stroke(p)
      g.restore()
    }
  }
  g.restore()
}
