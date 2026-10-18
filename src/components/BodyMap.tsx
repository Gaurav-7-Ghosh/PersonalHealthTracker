// Front and back body outline with tappable zones. Each zone opens a region.
// Drawn on a 200 x 400 grid; right-side shapes mirror the left ones.

type Zone = { region: string; d: string; mirror?: boolean }

const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0z`

const FRONT: Zone[] = [
  { region: 'Neck', d: 'M92 38L108 38L110 52L90 52Z' },
  { region: 'Shoulders', d: ellipse(60, 72, 12, 15), mirror: true },
  { region: 'Chest', d: 'M99 58L99 100Q84 107 72 98Q65 82 74 66Q84 58 99 58Z', mirror: true },
  { region: 'Arms', d: ellipse(52, 109, 8.5, 20), mirror: true },
  { region: 'Arms', d: ellipse(46, 153, 7.5, 21), mirror: true },
  { region: 'Core', d: 'M87 108h26v60q0 6-6 6h-14q-6 0-6-6z' },
  { region: 'Core', d: 'M76 108L84 110L84 168L78 171Q71 140 76 108Z', mirror: true },
  { region: 'Glutes and hips', d: 'M80 176L120 176L114 198L100 206L86 198Z' },
  { region: 'Legs', d: 'M81 200L98 208L96 284Q88 292 80 284Q72 242 81 200Z', mirror: true },
  { region: 'Legs', d: ellipse(88, 332, 8.5, 34), mirror: true },
]

const BACK: Zone[] = [
  { region: 'Back', d: 'M91 40L109 40L128 58L100 66L72 58Z' },
  { region: 'Shoulders', d: ellipse(60, 72, 12, 15), mirror: true },
  { region: 'Back', d: 'M78 64L122 64L117 102L83 102Z' },
  { region: 'Back', d: 'M72 80L81 104L86 140L77 140Q67 110 72 80Z', mirror: true },
  { region: 'Back', d: 'M88 106h24v58q0 6-6 6h-12q-6 0-6-6z' },
  { region: 'Arms', d: ellipse(52, 109, 8.5, 20), mirror: true },
  { region: 'Arms', d: ellipse(46, 153, 7.5, 21), mirror: true },
  { region: 'Glutes and hips', d: ellipse(89, 191, 12, 16), mirror: true },
  { region: 'Legs', d: 'M80 210L98 212L96 284Q88 292 80 284Q73 246 80 210Z', mirror: true },
  { region: 'Legs', d: ellipse(88, 328, 9.5, 30), mirror: true },
]

const MIRROR = 'translate(200 0) scale(-1 1)'

export function BodyMap({ side, onPick, highlight }: { side: 'front' | 'back'; onPick: (region: string) => void; highlight?: string }) {
  const zones = side === 'front' ? FRONT : BACK
  const zone = (z: Zone, i: number, flip: boolean) => (
    <path
      key={`${i}-${flip}`}
      d={z.d}
      transform={flip ? MIRROR : undefined}
      className={'zone' + (highlight === z.region ? ' on' : '')}
      data-region={z.region}
      onClick={() => onPick(z.region)}
    />
  )
  return (
    <svg className="bodymap" viewBox="0 0 200 400" role="img" aria-label={`${side === 'front' ? 'Front' : 'Back'} of the body. Tap a muscle group.`}>
      <g className="body-base">
        <circle cx="100" cy="23" r="15" />
        {[86, 114].map((x) => (
          <ellipse key={x} cx={x} cy="380" rx="9" ry="5" />
        ))}
        {[88, 112].map((x) => (
          <ellipse key={x} cx={x} cy="292" rx="7" ry="6" />
        ))}
      </g>
      {zones.map((z, i) => zone(z, i, false))}
      {zones.filter((z) => z.mirror).map((z, i) => zone(z, i, true))}
    </svg>
  )
}
