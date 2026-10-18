// Start workout flow: body map → muscle → exercises filtered by equipment → log.
import { useMemo, useState } from 'react'
import { BodyMap, regionMuscles, sideOf, sidesFor, type Side } from '../components/BodyMap'
import { Icon } from '../components/Icon'
import { Chip, Empty, Thumb, TopBar } from '../components/ui'
import { useStore } from '../store'
import { KINDS, REGIONS, regionsOfMuscle } from '../taxonomy'
import type { Entry, Kind } from '../types'
import { ago } from '../util'
import { fmtSet } from './EntryView'

const inRegion = (e: Entry, region: string) => e.regions.includes(region)
const worksMuscle = (e: Entry, m: string) => e.muscles.some((x) => x.name === m && x.role !== 'stabiliser')

export function BodyPicker() {
  const { entries, active, go } = useStore()
  const [side, setSide] = useState<Side>('front')
  const count = (r: string) => entries.filter((e) => inRegion(e, r)).length
  const pick = (muscle: string) => go({ name: 'exercises', region: regionsOfMuscle(muscle)[0] ?? 'Full body', muscle })

  return (
    <div className="screen">
      <TopBar title={active ? 'Add to workout' : 'Start workout'} />
      <h1>What are you training?</h1>
      <div className="segmented" role="tablist" aria-label="Side">
        <button type="button" role="tab" aria-selected={side === 'front'} onClick={() => setSide('front')}>
          Front
        </button>
        <button type="button" role="tab" aria-selected={side === 'back'} onClick={() => setSide('back')}>
          Back
        </button>
      </div>
      <div className="bodymap-wrap">
        <BodyMap side={side} onPick={pick} />
      </div>
      <p className="muted small center">Tap a muscle to see its exercises.</p>
      <h2>Or browse by body part</h2>
      <div className="region-grid">
        {REGIONS.map((r) => (
          <button key={r.name} type="button" className="region-btn" onClick={() => go({ name: 'region', region: r.name })}>
            <span>{r.name === 'Full body' ? 'Full body / HIIT' : r.name}</span>
            <span className="muted small">{count(r.name)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function RegionScreen({ region }: { region: string }) {
  const { entries, go } = useStore()
  const muscles = regionMuscles(region)
  const all = entries.filter((e) => inRegion(e, region))
  const sides = sidesFor(muscles)
  const pick = (m: string) => go({ name: 'exercises', region, muscle: m })
  return (
    <div className="screen">
      <TopBar sub="Start workout" title={region} />
      <h1>{region}</h1>
      {sides.length > 0 && (
        <div className="bodymap-wrap">
          {sides.map((sd) => (
            <div key={sd} className="bodymap-cap">
              <BodyMap side={sd} only={muscles} highlight={muscles} onPick={pick} className={sides.length > 1 ? 'bodymap half' : 'bodymap'} />
              {sides.length > 1 && <span className="muted small">{sd === 'front' ? 'Front' : 'Back'}</span>}
            </div>
          ))}
        </div>
      )}
      <ul className="list">
        {muscles.map((m) => {
          const n = entries.filter((e) => worksMuscle(e, m)).length
          return (
            <li key={m}>
              <button type="button" className="list-row big" onClick={() => go({ name: 'exercises', region, muscle: m })}>
                <span className="list-main">
                  <span className="list-name">{m}</span>
                  <span className="list-sub">{n ? `${n} exercises` : 'None yet, add your own'}</span>
                </span>
                <Icon name="next" size={18} className="chev" />
              </button>
            </li>
          )
        })}
        <li>
          <button type="button" className="list-row big" onClick={() => go({ name: 'exercises', region })}>
            <span className="list-main">
              <span className="list-name">All {region.toLowerCase()}</span>
              <span className="list-sub">{all.length} exercises</span>
            </span>
            <Icon name="next" size={18} className="chev" />
          </button>
        </li>
      </ul>
    </div>
  )
}

// Filters survive going into an exercise and back, per muscle.
const filters = new Map<string, { equipment: string[]; kind: Kind | 'all' }>()

export function ExerciseList({ region, muscle }: { region: string; muscle?: string }) {
  const { entries, go, history, addToSession, active } = useStore()
  const key = region + '/' + (muscle ?? '')
  const [equipment, setEquipment] = useState<string[]>(filters.get(key)?.equipment ?? [])
  const [kind, setKind] = useState<Kind | 'all'>(filters.get(key)?.kind ?? 'all')
  filters.set(key, { equipment, kind })

  const base = useMemo(
    () =>
      entries
        .filter((e) => (muscle ? worksMuscle(e, muscle) : inRegion(e, region)))
        .map((e) => ({ e, primary: muscle ? e.muscles.some((x) => x.name === muscle && x.role === 'primary') : true, last: history(e.id)[0] })),
    [entries, region, muscle, history],
  )
  const equipOptions = [...new Set(base.flatMap((x) => x.e.equipment))].sort()
  const kindOptions = KINDS.filter((k) => base.some((x) => x.e.kind === k.id))
  const list = base
    .filter((x) => (kind === 'all' || x.e.kind === kind) && (!equipment.length || x.e.equipment.some((q) => equipment.includes(q))))
    .sort((a, b) => Number(b.primary) - Number(a.primary) || (b.last?.session.startedAt ?? 0) - (a.last?.session.startedAt ?? 0) || a.e.name.localeCompare(b.e.name))

  const mapSide: Side | undefined = muscle ? (sidesFor([muscle]).length ? sideOf(muscle) : undefined) : sidesFor(regionMuscles(region))[0]
  const create = () => go({ name: 'edit', kind: kind === 'all' ? 'strength' : kind, region, muscle, equipment: equipment[0], returnBack: true })

  return (
    <div className="screen">
      <TopBar
        sub={region}
        title={muscle ?? `All ${region.toLowerCase()}`}
        right={
          <button type="button" className="btn small ghost" onClick={create}>
            <Icon name="plus" size={16} /> New
          </button>
        }
      />
      <div className="muscle-head">
        <h1>{muscle ?? region}</h1>
        {mapSide && <BodyMap side={mapSide} highlight={muscle ? [muscle] : regionMuscles(region)} className="bodymap mini" label={`${muscle ?? region} highlighted`} />}
      </div>

      {equipOptions.length > 1 && (
        <div className="field">
          <span className="label">Equipment</span>
          <div className="chips scroll">
            <Chip on={!equipment.length} onClick={() => setEquipment([])}>
              Any
            </Chip>
            {equipOptions.map((q) => (
              <Chip key={q} on={equipment.includes(q)} onClick={() => setEquipment(equipment.includes(q) ? equipment.filter((x) => x !== q) : [...equipment, q])}>
                {q}
              </Chip>
            ))}
          </div>
        </div>
      )}
      {kindOptions.length > 1 && (
        <div className="segmented" role="tablist" aria-label="Type">
          <button type="button" role="tab" aria-selected={kind === 'all'} onClick={() => setKind('all')}>
            All
          </button>
          {kindOptions.map((k) => (
            <button key={k.id} type="button" role="tab" aria-selected={kind === k.id} onClick={() => setKind(k.id)}>
              {k.plural}
            </button>
          ))}
        </div>
      )}

      {list.length ? (
        <ul className="list">
          {list.map(({ e, last }) => (
            <li key={e.id} className="pick-row">
              <button type="button" className="list-row" onClick={() => addToSession(e)} aria-label={`${active ? 'Add' : 'Start with'} ${e.name}`}>
                <Thumb entry={e} />
                <span className="list-main">
                  <span className="list-name">{e.name}</span>
                  <span className="list-sub">{e.equipment.join(', ') || 'Bodyweight'}</span>
                  <span className="list-meta">{last ? `${ago(last.session.startedAt)} · ${last.item.sets.map((s) => fmtSet(s, e)).join(', ')}` : 'Not logged yet'}</span>
                </span>
              </button>
              <button type="button" className="icon-btn" aria-label={`Details for ${e.name}`} onClick={() => go({ name: 'entry', id: e.id })}>
                <Icon name="next" size={18} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Empty
          title={base.length ? 'Nothing with that equipment' : 'No exercises here yet'}
          body="Add your own with its cues, photos and links. It shows up here next time."
          action={
            <button type="button" className="btn primary" onClick={create}>
              Create exercise
            </button>
          }
        />
      )}
      {list.length > 0 && (
        <button type="button" className="btn ghost" onClick={create}>
          <Icon name="plus" size={18} /> Create exercise for {muscle ?? region.toLowerCase()}
        </button>
      )}
    </div>
  )
}
