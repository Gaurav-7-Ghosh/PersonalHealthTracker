import { useEffect, useMemo, useState } from 'react'
import { FormCard } from '../components/FormCard'
import { Icon } from '../components/Icon'
import { BookmarkButton, Chip, Confirm, Empty, RenameSheet, RestPicker, Sheet, Stepper } from '../components/ui'
import { entryRest, useStore } from '../store'
import { rankSwaps, recentEntryIds } from '../swap'
import type { Entry, SessionItem, SetLog } from '../types'
import { ago, beep, fmtClock, fmtDate, fmtNum, fmtRest, keepAwake, vibrate } from '../util'
import { fmtSet } from './EntryView'

export function SessionScreen() {
  const store = useStore()
  const { active, entry, updateActive, finishActive, discardActive, lastSets, history, settings, replace, go } = store
  const [now, setNow] = useState(Date.now())
  const [swapOpen, setSwapOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [delSet, setDelSet] = useState<number | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [restOpen, setRestOpen] = useState(false)

  useEffect(() => {
    keepAwake(true)
    return () => {
      keepAwake(false)
    }
  }, [])

  // The rest is a timestamp on the session, so the right time shows after locking the phone or switching apps.
  // iOS pauses the page while it's hidden, so the beep can only sound while the app is open; on return a late rest says so instead.
  const restEnd = active?.restEnd ?? null
  const setRestEnd = (end: number | null) => updateActive((a) => ({ ...a, restEnd: end ?? undefined }))

  useEffect(() => {
    if (!restEnd) return
    const tick = () => {
      const n = Date.now()
      setNow(n)
      if (n < restEnd) return
      if (n - restEnd < 3000) {
        beep(880, 200)
        setTimeout(() => beep(1175, 260), 220)
        vibrate([200, 100, 200])
      } else if (n - restEnd < 10 * 60000) {
        store.notify(`Rest finished ${fmtClock((n - restEnd) / 1000)} ago`)
      }
      setRestEnd(null)
    }
    tick()
    const t = window.setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [restEnd])

  const item: SessionItem | undefined = active?.items[active.current]
  const e = item ? entry(item.entryId) : undefined

  // Prefill from this session's last set, else the same set last time, else the routine target.
  const prefill = useMemo((): SetLog => {
    if (!item) return { at: 0 }
    const mine = item.sets[item.sets.length - 1]
    if (mine) return mine
    const prev = lastSets(item.entryId)
    const p = prev?.[0]
    return {
      weight: p?.weight ?? item.target.weight ?? 0,
      reps: p?.reps ?? item.target.reps ?? 10,
      hold: p?.hold ?? item.target.hold ?? 30,
      tightness: p?.tightness,
      at: 0,
    }
  }, [item?.entryId, item?.sets.length, active?.current])

  const [cur, setCur] = useState<SetLog>(prefill)
  useEffect(() => setCur(prefill), [prefill])

  if (!active) {
    return (
      <div className="screen">
        <Empty title="No session running" action={<button type="button" className="btn primary" onClick={() => go({ name: 'today' })}>Back to Today</button>} />
      </div>
    )
  }

  const total = active.items.length
  const setsDone = active.items.reduce((n, i) => n + i.sets.length, 0)
  const nextItem = active.items[active.current + 1]
  const nextEntry = nextItem ? entry(nextItem.entryId) : undefined
  const prev = item ? history(item.entryId)[0] : undefined
  const isMobility = e && e.kind !== 'strength'
  const exerciseRest = e ? entryRest(e, settings) : settings.restStrength
  const rest = item?.target.rest ?? exerciseRest

  const setItemRest = (v: number | undefined) =>
    updateActive((a) => ({ ...a, items: a.items.map((it, i) => (i === a.current ? { ...it, target: { ...it.target, rest: v } } : it)) }))

  const logSet = () => {
    if (!item || !e) return
    const s: SetLog = { at: Date.now() }
    if (e.measure === 'weight_reps') Object.assign(s, { weight: cur.weight, reps: cur.reps })
    if (e.measure === 'reps') Object.assign(s, { reps: cur.reps, tightness: isMobility ? cur.tightness : undefined })
    if (e.measure === 'hold') Object.assign(s, { hold: cur.hold, tightness: cur.tightness })
    if (e.measure === 'time') Object.assign(s, { hold: cur.hold })
    updateActive((a) => ({ ...a, restEnd: Date.now() + rest * 1000, items: a.items.map((it, i) => (i === a.current ? { ...it, sets: [...it.sets, s] } : it)) }))
    const doneAll = item.sets.length + 1 >= item.target.sets
    setNow(Date.now())
    if (doneAll && active.current < total - 1) store.notify('All sets done. Next exercise when ready.')
  }

  const goTo = (i: number) => updateActive((a) => ({ ...a, current: Math.max(0, Math.min(a.items.length - 1, i)) }))

  const swapTo = (to: Entry) => {
    updateActive((a) => {
      const items = [...a.items]
      const old = items[a.current]
      const fresh: SessionItem = { entryId: to.id, swappedFrom: old.entryId, target: { ...old.target, entryId: to.id, weight: undefined }, sets: [] }
      if (old.sets.length) items.splice(a.current + 1, 0, fresh)
      else items[a.current] = fresh
      return { ...a, items, current: old.sets.length ? a.current + 1 : a.current }
    })
    setSwapOpen(false)
    store.notify(`Swapped to ${to.name}`)
  }

  const park = () => {
    updateActive((a) => {
      const items = [...a.items]
      const [x] = items.splice(a.current, 1)
      items.push(x)
      return { ...a, items, current: Math.min(a.current, items.length - 1) }
    })
    setSwapOpen(false)
    store.notify('Parked for later')
  }

  const resting = restEnd && restEnd > now

  return (
    <div className="screen session">
      <div className="session-top">
        <button type="button" className="icon-btn" aria-label="Plan" onClick={() => setPlanOpen(true)}>
          <Icon name="routines" />
        </button>
        <div className="session-name">
          <div className="eyebrow">{active.name}</div>
          <div className="muted small">
            {total ? `Exercise ${active.current + 1} of ${total}` : 'No exercises yet'} · {setsDone} sets
          </div>
        </div>
        <button type="button" className="icon-btn" aria-label="Add exercise" onClick={() => go({ name: 'body' })}>
          <Icon name="plus" />
        </button>
        <button type="button" className="btn small ghost" onClick={() => setFinishing(true)}>
          Finish
        </button>
      </div>
      {total > 0 && (
        <div className="progress" aria-hidden="true">
          {active.items.map((it, i) => (
            <span key={i} className={it.sets.length >= it.target.sets ? 'done' : i === active.current ? 'cur' : it.sets.length ? 'part' : ''} />
          ))}
        </div>
      )}

      {!item || !e ? (
        <Empty
          title="Add your first exercise"
          action={
            <button type="button" className="btn primary" onClick={() => go({ name: 'body' })}>
              Pick from the body map
            </button>
          }
        />
      ) : (
        <>
          <div className="ex-head">
            <div className="title-row">
              <h1>{e.name}</h1>
              <BookmarkButton entry={e} />
              <button type="button" className="icon-btn" aria-label="Rename" onClick={() => setRenaming(true)}>
                <Icon name="edit" size={18} />
              </button>
            </div>
            {item.swappedFrom && <div className="muted small">Swapped from {entry(item.swappedFrom)?.name}</div>}
            <div className="target-row muted">
              <span>
                Target {item.target.sets} × {e.measure === 'hold' ? `${item.target.hold ?? 30} s` : item.target.reps ?? 10}
              </span>
              <button type="button" className="rest-chip" aria-label={`Rest between sets: ${fmtRest(rest)}. Change`} onClick={() => setRestOpen(true)}>
                <Icon name="timer" size={16} /> Rest {fmtRest(rest)}
              </button>
            </div>
          </div>
          <RenameSheet entry={e} open={renaming} onClose={() => setRenaming(false)} />

          <section className="last-time" aria-label="Last time">
            <div className="last-time-head">
              <span className="eyebrow">Last time</span>
              <span className="muted small">{prev ? `${fmtDate(prev.session.startedAt)} · ${ago(prev.session.startedAt)}` : 'First time logging this'}</span>
            </div>
            {prev && (
              <ol className="last-sets">
                {prev.item.sets.map((s, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className={i === item.sets.length ? 'last-set now' : 'last-set'}
                      aria-label={`Use set ${i + 1} from last time: ${fmtSet(s, e)}`}
                      onClick={() => setCur({ ...cur, weight: s.weight ?? cur.weight, reps: s.reps ?? cur.reps, hold: s.hold ?? cur.hold })}
                    >
                      <span className="muted small">Set {i + 1}</span>
                      <span className="last-val">{fmtSet(s, e)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {e.cues.length > 0 && (
            <button type="button" className="cue-strip" onClick={() => setFormOpen(true)}>
              <ul className="cues">
                {e.cues.slice(0, 3).map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
              <span className="link-btn">{e.photos.length ? `Form card · ${e.photos.length} photos` : 'Form card'}</span>
            </button>
          )}

          <div className={e.measure === 'weight_reps' ? 'grid-2' : 'grid-1'}>
            {e.measure === 'weight_reps' && (
              <Stepper big label="Weight" unit="kg" step={settings.weightStep} value={cur.weight ?? 0} onChange={(v) => setCur({ ...cur, weight: v })} />
            )}
            {(e.measure === 'weight_reps' || e.measure === 'reps') && (
              <Stepper big label="Reps" step={1} value={cur.reps ?? 0} onChange={(v) => setCur({ ...cur, reps: v })} />
            )}
            {(e.measure === 'hold' || e.measure === 'time') && (
              <Stepper big label="Seconds" unit="s" step={5} value={cur.hold ?? 0} onChange={(v) => setCur({ ...cur, hold: v })} />
            )}
          </div>

          {isMobility && e.measure !== 'time' && (
            <div className="field">
              <span className="label">Tightness (1 loose, 5 very tight)</span>
              <div className="chips">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Chip key={n} on={cur.tightness === n} onClick={() => setCur({ ...cur, tightness: cur.tightness === n ? undefined : n })} label={`Tightness ${n}`}>
                    {n}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <div className="sets" aria-label="Sets">
            {Array.from({ length: Math.max(item.target.sets, item.sets.length + 1) }).map((_, i) => {
              const s = item.sets[i]
              return s ? (
                <button key={i} type="button" className="set done" onClick={() => setDelSet(i)} aria-label={`Set ${i + 1}: ${fmtSet(s, e)}. Tap to delete`}>
                  {e.measure === 'weight_reps' ? `${fmtNum(s.weight)}×${s.reps}` : e.measure === 'reps' ? `${s.reps}` : `${s.hold}s`}
                </button>
              ) : (
                <span key={i} className={i === item.sets.length ? 'set cur' : 'set'}>
                  Set {i + 1}
                </span>
              )
            })}
          </div>

          {resting && (
            <div className="rest" role="timer" aria-live="off">
              <span className="muted">Rest</span>
              <span className="rest-time">{fmtClock((restEnd! - now) / 1000)}</span>
              <button type="button" className="btn small ghost" onClick={() => setRestEnd(Math.max(Date.now() + 1000, restEnd! - 15000))}>
                −15 s
              </button>
              <button type="button" className="btn small ghost" onClick={() => setRestEnd(restEnd! + 15000)}>
                +15 s
              </button>
              <button type="button" className="btn small ghost" onClick={() => setRestEnd(null)}>
                Skip
              </button>
            </div>
          )}

          <div className="next-line muted">
            {nextEntry ? `Up next · ${nextEntry.name}` : 'Last exercise'}
          </div>

          <div className="session-actions">
            <button type="button" className="btn primary xl" onClick={logSet}>
              Log set {item.sets.length + 1}
            </button>
            <div className="row-3">
              <button type="button" className="btn ghost" onClick={() => goTo(active.current - 1)} disabled={active.current === 0} aria-label="Previous exercise">
                <Icon name="back" />
              </button>
              <button type="button" className="btn warn" onClick={() => setSwapOpen(true)}>
                <Icon name="swap" /> Busy? Swap
              </button>
              <button type="button" className="btn ghost" onClick={() => (active.current < total - 1 ? goTo(active.current + 1) : setFinishing(true))} aria-label="Next exercise">
                <Icon name="next" />
              </button>
            </div>
          </div>
        </>
      )}

      {e && item && (
        <SwapSheet open={swapOpen} onClose={() => setSwapOpen(false)} from={e} exclude={active.items.map((i) => i.entryId)} onPick={swapTo} onPark={park} canPark={total > 1} />
      )}

      {e && item && (
        <Sheet open={restOpen} onClose={() => setRestOpen(false)} title="Rest between sets">
          <RestPicker
            value={item.target.rest}
            fallback={exerciseRest}
            onChange={(v) => {
              setItemRest(v)
              if (resting && v !== undefined) setRestEnd(Math.max(Date.now() + 1000, (restEnd ?? 0) + (v - rest) * 1000))
            }}
          />
          <p className="muted small">
            Applies to {e.name} in this workout. {e.rest !== undefined ? `Its usual rest is ${fmtRest(e.rest)}.` : `Default is ${fmtRest(exerciseRest)} for ${isMobility ? 'mobility' : 'strength'}, set in Settings.`}
          </p>
          <div className="stack">
            <button
              type="button"
              className="btn primary"
              disabled={rest === e.rest}
              onClick={async () => {
                await store.saveEntry({ ...e, rest, updatedAt: Date.now() })
                setItemRest(undefined)
                setRestOpen(false)
                store.notify(`Rest for ${e.name} is now ${fmtRest(rest)} every time`)
              }}
            >
              Use {fmtRest(rest)} every time for this exercise
            </button>
            <button type="button" className="btn ghost" onClick={() => setRestOpen(false)}>
              Done
            </button>
          </div>
        </Sheet>
      )}

      <Sheet open={formOpen} onClose={() => setFormOpen(false)} title={e?.name ?? ''}>
        {e && <FormCard entry={e} onEdit={() => (setFormOpen(false), go({ name: 'formEdit', id: e.id }))} />}
      </Sheet>

      <Sheet open={planOpen} onClose={() => setPlanOpen(false)} title="Session plan">
        <ul className="list">
          {active.items.map((it, i) => {
            const x = entry(it.entryId)
            return (
              <li key={i}>
                <button
                  type="button"
                  className={'list-row' + (i === active.current ? ' current' : '')}
                  onClick={() => {
                    goTo(i)
                    setPlanOpen(false)
                  }}
                >
                  <span className="list-main">
                    <span className="list-name">{x?.name ?? 'Deleted'}</span>
                    <span className="list-sub">
                      {it.sets.length} of {it.target.sets} sets
                    </span>
                  </span>
                  {it.sets.length >= it.target.sets && <Icon name="check" className="accent-ink" />}
                </button>
              </li>
            )
          })}
        </ul>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            setPlanOpen(false)
            go({ name: 'body' })
          }}
        >
          <Icon name="plus" size={18} /> Add exercise
        </button>
      </Sheet>

      <Confirm
        open={delSet !== null}
        title={`Delete set ${(delSet ?? 0) + 1}?`}
        action="Delete set"
        danger
        onClose={() => setDelSet(null)}
        onConfirm={() =>
          updateActive((a) => ({ ...a, items: a.items.map((it, i) => (i === a.current ? { ...it, sets: it.sets.filter((_, j) => j !== delSet) } : it)) }))
        }
      />

      <Sheet open={finishing} onClose={() => setFinishing(false)} title="Finish session?">
        <p className="muted">
          {setsDone} sets across {active.items.filter((i) => i.sets.length).length} exercises. Exercises with no sets are left out.
        </p>
        <div className="stack">
          <button
            type="button"
            className="btn primary"
            onClick={async () => {
              const s = await finishActive()
              setFinishing(false)
              if (s && s.items.length) replace({ name: 'sessionDetail', id: s.id })
              else go({ name: 'today' })
            }}
          >
            Save and finish
          </button>
          <button type="button" className="btn ghost" onClick={() => setFinishing(false)}>
            Keep going
          </button>
          <button
            type="button"
            className="btn danger-ghost"
            onClick={async () => {
              await discardActive()
              setFinishing(false)
              go({ name: 'today' })
            }}
          >
            Discard session
          </button>
        </div>
      </Sheet>
    </div>
  )
}

function SwapSheet({
  open,
  onClose,
  from,
  exclude,
  onPick,
  onPark,
  canPark,
}: {
  open: boolean
  onClose: () => void
  from: Entry
  exclude: string[]
  onPick: (e: Entry) => void
  onPark: () => void
  canPark: boolean
}) {
  const { entries, sessions, settings, saveSettings, lastSets } = useStore()
  const busy = settings.busyEquipment
  const options = useMemo(
    () => rankSwaps(from, entries, { busy, recent: recentEntryIds(sessions), exclude: new Set(exclude), limit: 12 }),
    [from, entries, sessions, busy, exclude],
  )
  const tiers = [...new Set(options.map((o) => o.tier))]
  const busyChoices = from.equipment.filter((q) => q !== 'Bodyweight')

  return (
    <Sheet open={open} onClose={onClose} title={`Swap ${from.name}`}>
      {busyChoices.length > 0 && (
        <div className="field">
          <span className="label">What's taken? Swaps avoid it for the rest of today.</span>
          <div className="chips wrap">
            {busyChoices.map((q) => (
              <Chip key={q} on={busy.includes(q)} onClick={() => saveSettings({ busyEquipment: busy.includes(q) ? busy.filter((x) => x !== q) : [...busy, q] })}>
                {q} busy
              </Chip>
            ))}
          </div>
        </div>
      )}
      {tiers.map((t) => (
        <div key={t} className="tier">
          <div className="eyebrow">{t}</div>
          <ul className="list compact">
            {options
              .filter((o) => o.tier === t)
              .map((o) => {
                const last = lastSets(o.entry.id)?.[0]
                return (
                  <li key={o.entry.id}>
                    <button type="button" className="list-row" onClick={() => onPick(o.entry)}>
                      <span className="list-main">
                        <span className="list-name">{o.entry.name}</span>
                        <span className="list-sub">{o.reasons.join(' · ')}</span>
                        {last && <span className="list-meta accent-ink">Last: {fmtSet(last, o.entry)}</span>}
                      </span>
                      <span className="score">{Math.round(o.score * 100)}</span>
                    </button>
                  </li>
                )
              })}
          </ul>
        </div>
      ))}
      {!options.length && <p className="muted">Nothing similar is free. Park it and come back.</p>}
      {canPark && (
        <button type="button" className="btn ghost" onClick={onPark}>
          <Icon name="park" size={18} /> Park it, do it later
        </button>
      )}
      <p className="muted small">With no history on a swap, start with a weight that leaves 2 to 3 reps in reserve.</p>
    </Sheet>
  )
}
