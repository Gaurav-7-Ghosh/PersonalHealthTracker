import { Icon } from '../components/Icon'
import { useStore } from '../store'
import type { Routine } from '../types'
import { fmtDuration } from '../util'

const TYPE_LABEL = { gym: 'Gym', mobility: 'Mobility', hiit: 'Home HIIT' }

export function Today() {
  const { active, routines, sessions, inbox, entry, go, startSession } = useStore()
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })

  const start = async (r: Routine) => {
    if (r.type === 'hiit') return go({ name: 'hiit', routineId: r.id })
    await startSession({ routine: r })
    go({ name: 'session' })
  }

  const ordered = [...routines].sort((a, b) => {
    const la = sessions.find((s) => s.routineId === a.id)?.startedAt ?? 0
    const lb = sessions.find((s) => s.routineId === b.id)?.startedAt ?? 0
    return la - lb || a.name.localeCompare(b.name)
  })

  return (
    <div className="screen">
      <header className="hero">
        <div className="eyebrow">{today}</div>
        <h1>Today</h1>
      </header>

      {active && (
        <button type="button" className="card resume" onClick={() => go(active.type === 'hiit' ? { name: 'hiit' } : { name: 'session' })}>
          <span>
            <span className="eyebrow accent-ink">In progress</span>
            <span className="card-title">{active.name}</span>
            <span className="muted">
              {active.items.reduce((n, i) => n + i.sets.length, 0)} sets logged · started {fmtDuration(Date.now() - active.startedAt)} ago
            </span>
          </span>
          <Icon name="next" size={24} />
        </button>
      )}

      <div className="quick">
        <button type="button" className="quick-btn" onClick={() => go({ name: 'capture' })}>
          <Icon name="link" size={22} />
          Save a link
        </button>
        <button type="button" className="quick-btn" onClick={() => go({ name: 'hiit' })}>
          <Icon name="flame" size={22} />
          Home HIIT
        </button>
        <button
          type="button"
          className="quick-btn"
          onClick={async () => {
            await startSession({ name: 'Quick session', entryIds: [] })
            go({ name: 'session' })
          }}
        >
          <Icon name="dumbbell" size={22} />
          Empty session
        </button>
        <button type="button" className="quick-btn" onClick={() => go({ name: 'capture' })}>
          <Icon name="inbox" size={22} />
          Inbox
          {inbox.length > 0 && <span className="badge">{inbox.length}</span>}
        </button>
      </div>

      <div className="section-head">
        <h2>Start a routine</h2>
        <button type="button" className="link-btn" onClick={() => go({ name: 'routines' })}>
          All routines
        </button>
      </div>
      <p className="muted small">Least recently done first.</p>
      <div className="stack">
        {ordered.map((r) => {
          const last = sessions.find((s) => s.routineId === r.id)
          return (
            <div key={r.id} className="card routine-card">
              <div className="routine-head">
                <div>
                  <span className="eyebrow">{TYPE_LABEL[r.type]}</span>
                  <div className="card-title">{r.name}</div>
                </div>
                <span className="muted small">{last ? new Date(last.startedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'Not done yet'}</span>
              </div>
              <div className="muted small clamp">
                {r.items
                  .map((i) => entry(i.entryId)?.name)
                  .filter(Boolean)
                  .join(' · ')}
              </div>
              <button type="button" className="btn primary" onClick={() => start(r)}>
                {r.type === 'hiit' ? 'Set up timer' : 'Start'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
