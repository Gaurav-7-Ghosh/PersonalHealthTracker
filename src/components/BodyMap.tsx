// Front and back body figure with one tappable zone per muscle.
// Drawn on a 200 x 420 grid. Shapes are written for the viewer's left half and
// mirrored, and both halves sit in one <g> so they act as a single target.
import { REGIONS } from '../taxonomy'

export type Side = 'front' | 'back'
type Zone = { muscle: string; d: string }

// Outline of the left half, top of the neck down to the crotch, smoothed below.
const OUTLINE: [number, number][] = [
  [93, 44], [92, 54], [80, 59], [66, 62], [56, 67], [50, 78], [49, 92], [48, 108], [47, 126], [45, 140],
  [41, 160], [38, 182], [36, 196], [33, 206], [36, 214], [42, 210], [45, 198], [48, 184], [53, 162], [57, 144],
  [61, 128], [63, 110], [65, 104], [68, 124], [70, 150], [69, 168], [70, 186], [71, 214], [73, 248], [76, 280],
  [74, 300], [73, 326], [77, 356], [80, 384], [76, 398], [80, 404], [94, 403], [93, 384], [93, 352], [95, 318],
  [95, 290], [96, 260], [98, 230], [100, 214],
]

// Catmull-Rom through the points, as cubic Béziers.
function smooth(pts: [number, number][]) {
  let d = `M${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const [p1, p2] = [pts[i], pts[i + 1]]
    const p3 = pts[i + 2] ?? p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`
  }
  return d
}
const mirrorPts = (pts: [number, number][]) => pts.map(([x, y]) => [200 - x, y] as [number, number])
const SILHOUETTE = smooth([...OUTLINE, ...mirrorPts(OUTLINE).reverse()]) + 'Z'

const FRONT: Zone[] = [
  { muscle: 'Neck flexors', d: 'M94 47Q97 52 98 60L92 58Q92 52 94 47Z' },
  { muscle: 'Upper traps', d: 'M91 56L91 60L76 62Q84 58 91 56Z' },
  { muscle: 'Side delt', d: 'M60 66Q51 72 50 86Q51 93 54 95Q54 80 61 70Z' },
  { muscle: 'Front delt', d: 'M63 68Q56 80 57 96Q63 90 67 80Q70 70 77 64Q68 63 63 68Z' },
  { muscle: 'Upper chest', d: 'M98 64L80 64Q71 68 69 77L98 78Z' },
  { muscle: 'Mid chest', d: 'M98 80L68 79Q66 87 68 94L98 92Z' },
  { muscle: 'Lower chest', d: 'M98 94L69 96Q74 106 86 107Q94 107 98 102Z' },
  { muscle: 'Serratus anterior', d: 'M67 101L72 106L72 116L69 120Q66 110 67 101Z' },
  { muscle: 'Biceps', d: 'M56 98Q50 112 51 130Q55 138 61 132Q65 116 64 102Z' },
  { muscle: 'Forearms', d: 'M49 140Q43 156 40 178Q43 184 47 182Q54 164 57 144Q53 138 49 140Z' },
  { muscle: 'Upper abs', d: 'M99 110L88 110Q86 121 87 133L99 133Z' },
  { muscle: 'Lower abs', d: 'M99 136L87 136Q87 158 92 172L99 175Z' },
  { muscle: 'Obliques', d: 'M84 109L75 112Q71 132 73 156Q78 166 86 170Q83 140 84 109Z' },
  { muscle: 'Hip flexors', d: 'M75 172L86 174L93 190L84 197Q78 186 75 172Z' },
  { muscle: 'Adductors', d: 'M95 196L99 205L98 240L93 250Q89 222 95 196Z' },
  { muscle: 'Quads', d: 'M74 190Q70 230 77 274Q85 282 92 275Q95 250 91 220L82 200Z' },
  { muscle: 'Tibialis', d: 'M76 300Q73 324 77 352L81 352Q80 324 83 300Z' },
  { muscle: 'Calves', d: 'M87 300Q93 316 91 338L86 338Q85 318 86 300Z' },
]

const BACK: Zone[] = [
  { muscle: 'Upper traps', d: 'M98 46L93 47L91 56Q82 60 74 63L98 74Z' },
  { muscle: 'Side delt', d: 'M60 66Q51 72 50 86Q51 93 54 95Q54 80 61 70Z' },
  { muscle: 'Rear delt', d: 'M63 68Q56 80 57 96Q63 90 67 80Q70 70 74 65Q68 63 63 68Z' },
  { muscle: 'Mid back', d: 'M98 76L74 66Q71 76 75 86L98 98Z' },
  { muscle: 'Lower traps', d: 'M98 100L84 92L93 122L98 124Z' },
  { muscle: 'Lats', d: 'M75 88Q67 98 69 116Q73 142 86 156L93 142Q86 112 81 94Z' },
  { muscle: 'Triceps', d: 'M56 98Q50 112 51 130Q55 138 61 132Q65 116 64 102Z' },
  { muscle: 'Forearms', d: 'M49 140Q43 156 40 178Q43 184 47 182Q54 164 57 144Q53 138 49 140Z' },
  { muscle: 'Lower back', d: 'M99 127L93 128Q89 150 91 170L99 172Z' },
  { muscle: 'Glute med', d: 'M71 166Q68 176 70 186Q74 178 86 173L88 166Q80 164 71 166Z' },
  { muscle: 'Glute max', d: 'M98 177L90 177Q75 186 74 204Q80 216 98 213Z' },
  { muscle: 'Hamstrings', d: 'M74 218Q71 248 78 278L92 280Q96 250 97 220Z' },
  { muscle: 'Calves', d: 'M76 298Q70 318 76 342Q84 348 90 338Q94 314 91 298Z' },
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
  /** Muscles drawn in the accent colour. */
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
      <circle className="body-base" cx="100" cy="26" r="17" />
      <path className="body-base" d={SILHOUETTE} />
      {ZONES[side].map((z) => {
        const off = allowed && !allowed.has(z.muscle)
        const tappable = onPick && !off
        return (
          <g
            key={z.muscle}
            className={'zone' + (lit.has(z.muscle) ? ' on' : '') + (off ? ' off' : '') + (tappable ? ' tap' : '')}
            data-muscle={z.muscle}
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
