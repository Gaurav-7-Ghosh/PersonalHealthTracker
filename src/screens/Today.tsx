import { Icon } from '../components/Icon'
import { kcal, total, useToday } from '../nutrition'
import { useStore } from '../store'
import { fmtDate, fmtDuration } from '../util'

export function Today() {
  const { active, routines, sessions, entries, foodLog, settings, go } = useStore()
  const day = useToday()
  const eaten = total(foodLog.filter((l) => l.day === day)).kcal
  const bookmarks = entries.filter((e) => e.bookmarkedAt).length
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })
  const recent = sessions.slice(0, 3)

  return (
    <div className="screen">
      <header className="hero">
        <div className="eyebrow">{today}</div>
        <h1>Today</h1>
      </header>

      {active ? (
        <button type="button" className="card resume" onClick={() => go({ name: 'session' })}>
          <span>
            <span className="eyebrow accent-ink">In progress</span>
            <span className="card-title">{active.name === 'Workout' ? 'Workout' : active.name}</span>
            <span className="muted">
              {active.items.length} exercises · {active.items.reduce((n, i) => n + i.sets.length, 0)} sets · started {fmtDuration(Date.now() - active.startedAt)} ago
            </span>
          </span>
          <Icon name="next" size={24} />
        </button>
      ) : (
        <button type="button" className="start-card" onClick={() => go({ name: 'body' })}>
          <Icon name="body" size={40} />
          <span className="start-title">Start workout</span>
          <span className="muted">Pick a body part, then a muscle, then the exercise</span>
        </button>
      )}

      <div className="quick three">
        <button type="button" className="quick-btn" onClick={() => go({ name: 'hiit' })}>
          <Icon name="flame" size={22} />
          Home HIIT
        </button>
        <button type="button" className="quick-btn" onClick={() => go({ name: 'capture' })}>
          <Icon name="link" size={22} />
          Save a link
        </button>
        <button type="button" className="quick-btn" onClick={() => go({ name: 'bookmarks' })}>
          <Icon name="bookmark" size={22} />
          Bookmarks
          {bookmarks > 0 && <span className="badge soft">{bookmarks}</span>}
        </button>
      </div>

      <button type="button" className="card kcal-mini" onClick={() => go({ name: 'health' })}>
        <span className="list-main">
          <span className="eyebrow">Calories today</span>
          <span>
            <span className="stat-val">{kcal(eaten)}</span> <span className="muted">of {kcal(settings.kcalGoal || 2000)} kcal</span>
          </span>
        </span>
        <span className="mini-bar" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (eaten / (settings.kcalGoal || 2000)) * 100)}%` }} />
        </span>
        <Icon name="next" className="chev" />
      </button>

      {recent.length > 0 && (
        <section className="block">
          <div className="section-head">
            <h2>Recent</h2>
            <button type="button" className="link-btn" onClick={() => go({ name: 'history' })}>
              History
            </button>
          </div>
          <ul className="list compact">
            {recent.map((s) => (
              <li key={s.id}>
                <button type="button" className="list-row" onClick={() => go({ name: 'sessionDetail', id: s.id })}>
                  <span className="list-main">
                    <span className="list-name">{s.name}</span>
                    <span className="list-sub">
                      {fmtDate(s.startedAt)} · {s.hiit ? `${s.hiit.roundsDone} rounds` : `${s.items.reduce((n, i) => n + i.sets.length, 0)} sets`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {routines.length > 0 && (
        <button type="button" className="link-btn" onClick={() => go({ name: 'routines' })}>
          Saved routines ({routines.length})
        </button>
      )}
    </div>
  )
}
