import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Confirm, EntryPicker, Stepper, TopBar } from '../components/ui'
import { useStore } from '../store'
import type { Routine, RoutineItem, RoutineType } from '../types'
import { uid } from '../util'

const TYPES: { id: RoutineType; label: string }[] = [
  { id: 'gym', label: 'Gym' },
  { id: 'mobility', label: 'Mobility' },
  { id: 'hiit', label: 'Home HIIT' },
]

export function Routines() {
  const { routines, entry, go, startSession } = useStore()
  return (
    <div className="screen">
      <header className="hero row-between">
        <h1>Routines</h1>
        <button type="button" className="btn small primary" onClick={() => go({ name: 'routine' })}>
          <Icon name="plus" size={18} /> New
        </button>
      </header>
      {TYPES.map((t) => {
        const list = routines.filter((r) => r.type === t.id).sort((a, b) => a.name.localeCompare(b.name))
        if (!list.length) return null
        return (
          <section key={t.id} className="block">
            <h2>{t.label}</h2>
            <ul className="list">
              {list.map((r) => (
                <li key={r.id} className="routine-row">
                  <button type="button" className="list-row" onClick={() => go({ name: 'routine', id: r.id })}>
                    <span className="list-main">
                      <span className="list-name">{r.name}</span>
                      <span className="list-sub clamp">
                        {r.type === 'hiit' && r.hiit ? `${r.hiit.work}s on / ${r.hiit.rest}s off × ${r.hiit.rounds} rounds · ` : ''}
                        {r.items.map((i) => entry(i.entryId)?.name ?? 'Deleted').join(', ')}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="icon-btn play"
                    aria-label={`Start ${r.name}`}
                    onClick={async () => {
                      if (r.type === 'hiit') return go({ name: 'hiit', routineId: r.id })
                      await startSession({ routine: r })
                      go({ name: 'session' })
                    }}
                  >
                    <Icon name="play" size={18} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

export function RoutineEdit({ id, type }: { id?: string; type?: RoutineType }) {
  const { routines, entry, saveRoutine, deleteRoutine, back, notify } = useStore()
  const original = routines.find((r) => r.id === id)
  const [r, setR] = useState<Routine>(
    () => original ?? { id: uid(), name: '', type: type ?? 'gym', items: [], hiit: { work: 40, rest: 20, rounds: 4 }, updatedAt: Date.now() },
  )
  const [picking, setPicking] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const set = (p: Partial<Routine>) => setR((x) => ({ ...x, ...p }))
  const setItem = (i: number, p: Partial<RoutineItem>) => set({ items: r.items.map((it, j) => (j === i ? { ...it, ...p } : it)) })
  const move = (i: number, d: number) => {
    const items = [...r.items]
    const [x] = items.splice(i, 1)
    items.splice(Math.max(0, Math.min(items.length, i + d)), 0, x)
    set({ items })
  }

  return (
    <div className="screen form">
      <TopBar
        title={original ? 'Edit routine' : 'New routine'}
        right={
          <button
            type="button"
            className="btn small primary"
            onClick={async () => {
              if (!r.name.trim()) return notify('Give it a name first')
              await saveRoutine({ ...r, name: r.name.trim() })
              notify('Saved')
              back()
            }}
          >
            Save
          </button>
        }
      />
      <div className="field">
        <label htmlFor="r-name">Name</label>
        <input id="r-name" value={r.name} placeholder="e.g. Push day, crowded gym" onChange={(x) => set({ name: x.target.value })} />
      </div>
      <div className="segmented" role="tablist" aria-label="Routine type">
        {TYPES.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={r.type === t.id} onClick={() => set({ type: t.id })}>
            {t.label}
          </button>
        ))}
      </div>

      {r.type === 'hiit' && r.hiit && (
        <div className="grid-3">
          <Stepper label="Work" unit="s" step={5} value={r.hiit.work} onChange={(v) => set({ hiit: { ...r.hiit!, work: v } })} />
          <Stepper label="Rest" unit="s" step={5} value={r.hiit.rest} onChange={(v) => set({ hiit: { ...r.hiit!, rest: v } })} />
          <Stepper label="Rounds" step={1} min={1} value={r.hiit.rounds} onChange={(v) => set({ hiit: { ...r.hiit!, rounds: v } })} />
        </div>
      )}

      <section className="block">
        <h2>{r.type === 'hiit' ? 'Moves per round' : 'Exercises'}</h2>
        <ul className="list">
          {r.items.map((it, i) => {
            const e = entry(it.entryId)
            const hold = e?.measure === 'hold'
            return (
              <li key={i} className="routine-item">
                <div className="row-between">
                  <span className="list-name">
                    {i + 1}. {e?.name ?? 'Deleted entry'}
                  </span>
                  <span className="row-tight">
                    <button type="button" className="icon-btn" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                      <Icon name="up" size={18} />
                    </button>
                    <button type="button" className="icon-btn" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === r.items.length - 1}>
                      <Icon name="down" size={18} />
                    </button>
                    <button type="button" className="icon-btn" aria-label="Remove" onClick={() => set({ items: r.items.filter((_, j) => j !== i) })}>
                      <Icon name="trash" size={18} />
                    </button>
                  </span>
                </div>
                {r.type !== 'hiit' && (
                  <div className="grid-3 tight">
                    <Stepper label={`Sets ${i + 1}`} step={1} min={1} value={it.sets} onChange={(v) => setItem(i, { sets: v })} />
                    {hold ? (
                      <Stepper label={`Hold ${i + 1}`} unit="s" step={5} value={it.hold ?? 30} onChange={(v) => setItem(i, { hold: v })} />
                    ) : (
                      <Stepper label={`Reps ${i + 1}`} step={1} value={it.reps ?? 10} onChange={(v) => setItem(i, { reps: v })} />
                    )}
                    {e?.measure === 'weight_reps' && (
                      <Stepper label={`Kg ${i + 1}`} step={2.5} value={it.weight ?? 0} onChange={(v) => setItem(i, { weight: v || undefined })} />
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        <button type="button" className="btn ghost" onClick={() => setPicking(true)}>
          <Icon name="plus" size={18} /> Add {r.type === 'hiit' ? 'move' : 'exercise'}
        </button>
      </section>

      {original && (
        <button type="button" className="btn danger-ghost" onClick={() => setConfirm(true)}>
          Delete routine
        </button>
      )}

      <EntryPicker
        open={picking}
        onClose={() => setPicking(false)}
        kinds={r.type === 'hiit' ? ['hiit', 'strength'] : r.type === 'mobility' ? ['mobility', 'stretch', 'warmup'] : undefined}
        onPick={(e) => {
          const hold = e.measure === 'hold'
          set({ items: [...r.items, { entryId: e.id, sets: r.type === 'hiit' ? 1 : e.kind === 'strength' ? 3 : 2, reps: hold ? undefined : 10, hold: hold ? 30 : undefined }] })
        }}
      />
      <Confirm
        open={confirm}
        title={`Delete ${r.name}?`}
        body="Past sessions from this routine stay in your history."
        action="Delete"
        danger
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          await deleteRoutine(r.id)
          back()
        }}
      />
    </div>
  )
}
