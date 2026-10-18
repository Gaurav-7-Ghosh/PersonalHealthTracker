import { useState } from 'react'
import { Confirm, Empty, TopBar } from '../components/ui'
import { useStore } from '../store'
import { fmtDate, fmtDuration, fmtNum } from '../util'
import { fmtSet } from './EntryView'

export function History() {
  const { sessions, go } = useStore()
  const weekAgo = Date.now() - 7 * 864e5
  const week = sessions.filter((s) => s.startedAt >= weekAgo)
  const sets = week.reduce((n, s) => n + s.items.reduce((m, i) => m + i.sets.length, 0), 0)

  return (
    <div className="screen">
      <header className="hero">
        <h1>History</h1>
      </header>
      <div className="grid-2">
        <div className="stat">
          <div className="eyebrow">Last 7 days</div>
          <div className="stat-val big">{week.length}</div>
          <div className="muted small">sessions</div>
        </div>
        <div className="stat">
          <div className="eyebrow">Sets logged</div>
          <div className="stat-val big">{sets}</div>
          <div className="muted small">in the last 7 days</div>
        </div>
      </div>
      {sessions.length ? (
        <ul className="list">
          {sessions.map((s) => (
            <li key={s.id}>
              <button type="button" className="list-row" onClick={() => go({ name: 'sessionDetail', id: s.id })}>
                <span className="list-main">
                  <span className="list-name">{s.name}</span>
                  <span className="list-sub">
                    {fmtDate(s.startedAt)} · {s.endedAt ? fmtDuration(s.endedAt - s.startedAt) : 'unfinished'} ·{' '}
                    {s.hiit ? `${s.hiit.roundsDone} rounds` : `${s.items.reduce((n, i) => n + i.sets.length, 0)} sets`}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="No sessions yet" body="Start a routine from Today. Finished sessions show up here." />
      )}
    </div>
  )
}

export function SessionDetail({ id }: { id: string }) {
  const { sessions, entry, deleteSession, back, go } = useStore()
  const [confirm, setConfirm] = useState(false)
  const s = sessions.find((x) => x.id === id)
  if (!s) return <Empty title="Session not found" />
  const volume = s.items.reduce((v, i) => v + i.sets.reduce((w, x) => w + (x.weight ?? 0) * (x.reps ?? 0), 0), 0)
  const setCount = s.items.reduce((n, i) => n + i.sets.length, 0)
  return (
    <div className="screen">
      <TopBar sub={fmtDate(s.startedAt)} title={s.name} />
      <div className="grid-3">
        <div className="stat">
          <div className="eyebrow">Time</div>
          <div className="stat-val">{s.endedAt ? fmtDuration(s.endedAt - s.startedAt) : '-'}</div>
        </div>
        <div className="stat">
          <div className="eyebrow">{s.hiit ? 'Rounds' : 'Sets'}</div>
          <div className="stat-val">{s.hiit ? `${s.hiit.roundsDone} of ${s.hiit.rounds}` : setCount}</div>
        </div>
        <div className="stat">
          <div className="eyebrow">{s.hiit ? 'Intervals' : 'Volume'}</div>
          <div className="stat-val">{s.hiit ? `${s.hiit.work}/${s.hiit.rest} s` : `${fmtNum(Math.round(volume))} kg`}</div>
        </div>
      </div>
      <ul className="list">
        {s.items.map((it, i) => {
          const e = entry(it.entryId)
          return (
            <li key={i}>
              <button type="button" className="list-row" onClick={() => e && go({ name: 'entry', id: e.id })}>
                <span className="list-main">
                  <span className="list-name">{e?.name ?? 'Deleted entry'}</span>
                  {it.swappedFrom && <span className="list-meta">Swapped from {entry(it.swappedFrom)?.name}</span>}
                  <span className="list-sub">{e ? it.sets.map((x) => fmtSet(x, e)).join(', ') : `${it.sets.length} sets`}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <button type="button" className="btn danger-ghost" onClick={() => setConfirm(true)}>
        Delete session
      </button>
      <Confirm
        open={confirm}
        title="Delete this session?"
        body="Its sets are removed from your history and records."
        action="Delete"
        danger
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          await deleteSession(s.id)
          back()
        }}
      />
    </div>
  )
}
