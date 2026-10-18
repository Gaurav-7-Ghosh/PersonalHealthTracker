import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { Chip, EntryPicker, Photo, Stepper, TopBar } from '../components/ui'
import { useStore } from '../store'
import type { Routine, Session } from '../types'
import { beep, fmtClock, keepAwake, uid, vibrate } from '../util'

interface Step {
  phase: 'get ready' | 'work' | 'rest'
  entryId?: string
  round: number
  seconds: number
}

export function Hiit({ routineId }: { routineId?: string }) {
  const { routines, entries, entry, saveSession, notify, replace } = useStore()
  const hiitRoutines = routines.filter((r) => r.type === 'hiit')
  const [routine, setRoutine] = useState<Routine | undefined>(() => hiitRoutines.find((r) => r.id === routineId) ?? hiitRoutines[0])
  const [work, setWork] = useState(routine?.hiit?.work ?? 40)
  const [rest, setRest] = useState(routine?.hiit?.rest ?? 20)
  const [rounds, setRounds] = useState(routine?.hiit?.rounds ?? 4)
  const [moves, setMoves] = useState<string[]>(routine?.items.map((i) => i.entryId) ?? [])
  const [equip, setEquip] = useState<string[]>(['Bodyweight'])
  const [picking, setPicking] = useState(false)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!routine) return
    setWork(routine.hiit?.work ?? 40)
    setRest(routine.hiit?.rest ?? 20)
    setRounds(routine.hiit?.rounds ?? 4)
    setMoves(routine.items.map((i) => i.entryId))
  }, [routine?.id])

  const totalSec = rounds * moves.length * (work + rest) - rest + 5
  const homeMoves = entries.filter((e) => e.kind === 'hiit' && e.equipment.some((q) => equip.includes(q)))

  if (running)
    return (
      <Player
        work={work}
        rest={rest}
        rounds={rounds}
        moves={moves}
        onDone={async (roundsDone, seconds, finished) => {
          setRunning(false)
          if (seconds < 30) return notify('Under 30 seconds, so nothing was logged')
          const s: Session = {
            id: uid(),
            name: routine?.name ?? 'Home HIIT',
            type: 'hiit',
            routineId: routine?.id,
            startedAt: Date.now() - seconds * 1000,
            endedAt: Date.now(),
            current: 0,
            items: moves.map((id) => ({ entryId: id, target: { entryId: id, sets: rounds }, sets: Array.from({ length: roundsDone }, () => ({ hold: work, at: Date.now() })) })),
            hiit: { work, rest, rounds, roundsDone, seconds },
          }
          await saveSession(s)
          notify(finished ? 'Workout logged' : `Logged ${roundsDone} of ${rounds} rounds`)
          replace({ name: 'sessionDetail', id: s.id })
        }}
      />
    )

  return (
    <div className="screen form">
      <TopBar title="Home HIIT" />
      {hiitRoutines.length > 0 && (
        <div className="chips scroll">
          {hiitRoutines.map((r) => (
            <Chip key={r.id} on={routine?.id === r.id} onClick={() => setRoutine(r)}>
              {r.name}
            </Chip>
          ))}
        </div>
      )}
      <div className="grid-3">
        <Stepper label="Work" unit="s" step={5} min={5} value={work} onChange={setWork} />
        <Stepper label="Rest" unit="s" step={5} value={rest} onChange={setRest} />
        <Stepper label="Rounds" step={1} min={1} value={rounds} onChange={setRounds} />
      </div>
      <div className="muted">
        {moves.length} moves · about {Math.round(totalSec / 60)} min
      </div>

      <section className="block">
        <h2>Moves each round</h2>
        <ol className="moves">
          {moves.map((id, i) => {
            const e = entry(id)
            return (
              <li key={i} className="row-between">
                <span>{e?.name ?? 'Deleted'}</span>
                <button type="button" className="icon-btn" aria-label={`Remove ${e?.name}`} onClick={() => setMoves(moves.filter((_, j) => j !== i))}>
                  <Icon name="close" size={18} />
                </button>
              </li>
            )
          })}
        </ol>
        <button type="button" className="btn ghost small" onClick={() => setPicking(true)}>
          <Icon name="plus" size={16} /> Add move
        </button>
      </section>

      <section className="block">
        <h2>Ideas for your equipment</h2>
        <div className="chips wrap">
          {['Bodyweight', 'Dumbbell', 'Kettlebell', 'Band'].map((q) => (
            <Chip key={q} on={equip.includes(q)} onClick={() => setEquip(equip.includes(q) ? equip.filter((x) => x !== q) : [...equip, q])}>
              {q}
            </Chip>
          ))}
        </div>
        <div className="chips wrap">
          {homeMoves
            .filter((m) => !moves.includes(m.id))
            .map((m) => (
              <button key={m.id} type="button" className="chip add" onClick={() => setMoves([...moves, m.id])}>
                <Icon name="plus" size={14} /> {m.name}
              </button>
            ))}
        </div>
      </section>

      <div className="sticky-actions">
        <button type="button" className="btn primary xl" disabled={!moves.length} onClick={() => setRunning(true)}>
          <Icon name="play" /> Start
        </button>
      </div>
      <EntryPicker open={picking} onClose={() => setPicking(false)} kinds={['hiit', 'strength']} onPick={(e) => setMoves([...moves, e.id])} title="Add a move" />
    </div>
  )
}

function Player({ work, rest, rounds, moves, onDone }: { work: number; rest: number; rounds: number; moves: string[]; onDone: (roundsDone: number, seconds: number, finished: boolean) => void }) {
  const { entry } = useStore()
  const steps = useMemo(() => {
    const out: Step[] = [{ phase: 'get ready', entryId: moves[0], round: 1, seconds: 5 }]
    for (let r = 1; r <= rounds; r++)
      moves.forEach((m, i) => {
        out.push({ phase: 'work', entryId: m, round: r, seconds: work })
        const last = r === rounds && i === moves.length - 1
        if (!last && rest > 0) out.push({ phase: 'rest', entryId: moves[(i + 1) % moves.length], round: i === moves.length - 1 ? r + 1 : r, seconds: rest })
      })
    return out
  }, [work, rest, rounds, moves])

  const [idx, setIdx] = useState(0)
  const [left, setLeft] = useState(steps[0].seconds)
  const [paused, setPaused] = useState(false)
  const started = useRef(Date.now())
  const pausedFor = useRef(0)
  const pauseAt = useRef(0)

  useEffect(() => {
    keepAwake(true)
    return () => {
      keepAwake(false)
    }
  }, [])

  useEffect(() => {
    if (paused) return
    const end = Date.now() + left * 1000
    let shown = left
    const t = window.setInterval(() => {
      const l = Math.ceil((end - Date.now()) / 1000)
      if (l !== shown) {
        shown = l
        if (l <= 3 && l > 0) beep(660, 120)
        setLeft(l)
      }
      if (l <= 0) {
        window.clearInterval(t)
        if (idx + 1 >= steps.length) {
          beep(1320, 500)
          vibrate([300, 100, 300])
          finish(true)
        } else {
          const nx = steps[idx + 1]
          beep(nx.phase === 'work' ? 1046 : 523, 300)
          vibrate(200)
          setIdx(idx + 1)
          setLeft(nx.seconds)
        }
      }
    }, 200)
    return () => window.clearInterval(t)
  }, [idx, paused])

  const step = steps[idx]
  const e = step.entryId ? entry(step.entryId) : undefined
  const startPhoto = e?.photos.find((p) => p.position === 'start') ?? e?.photos[0]

  function finish(done: boolean) {
    const secs = Math.round((Date.now() - started.current - pausedFor.current) / 1000)
    const completed = steps.slice(0, idx + (done ? 1 : 0)).filter((s) => s.phase === 'work')
    onDone(Math.floor(completed.length / moves.length), secs, done)
  }

  const pct = 1 - left / step.seconds
  return (
    <div className={'player phase-' + step.phase.replace(' ', '-')}>
      <div className="player-top">
        <span className="eyebrow">
          Round {Math.min(step.round, rounds)} of {rounds}
        </span>
        <button type="button" className="btn small ghost" onClick={() => finish(false)}>
          End
        </button>
      </div>
      <div className="player-phase">{step.phase === 'rest' ? 'Rest · next up' : step.phase === 'get ready' ? 'Get ready' : 'Work'}</div>
      <div className="player-move">{e?.name}</div>
      <div className="ring" style={{ ['--p' as string]: String(pct) }}>
        <span className="ring-time">{fmtClock(left)}</span>
      </div>
      {startPhoto && <Photo id={startPhoto.id} alt={`${e?.name} start position`} className="player-photo" />}
      {e?.cues[0] && <div className="player-cue">{e.cues[0]}</div>}
      <div className="player-btns">
        <button
          type="button"
          className="btn ghost xl"
          onClick={() => {
            if (paused) {
              pausedFor.current += Date.now() - pauseAt.current
              setPaused(false)
            } else {
              pauseAt.current = Date.now()
              setPaused(true)
            }
          }}
        >
          <Icon name={paused ? 'play' : 'pause'} /> {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          type="button"
          className="btn ghost xl"
          onClick={() => {
            if (idx + 1 >= steps.length) return finish(true)
            setIdx(idx + 1)
            setLeft(steps[idx + 1].seconds)
          }}
        >
          <Icon name="skip" /> Skip
        </button>
      </div>
    </div>
  )
}
