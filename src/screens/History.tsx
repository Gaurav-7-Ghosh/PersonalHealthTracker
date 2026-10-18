import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { Confirm, Empty, Sheet, TopBar } from '../components/ui'
import { sessionTotals, workoutImage } from '../snapshot'
import { useStore } from '../store'
import { fmtDate, fmtDuration, fmtNum } from '../util'
import type { Session } from '../types'
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
  const [sharing, setSharing] = useState(false)
  const s = sessions.find((x) => x.id === id)
  if (!s) return <Empty title="Session not found" />
  const t = sessionTotals(s)
  return (
    <div className="screen">
      <TopBar sub={fmtDate(s.startedAt)} title={s.name} />
      <div className="grid-3">
        <div className="stat">
          <div className="eyebrow">Time</div>
          <div className="stat-val">{t.time}</div>
        </div>
        <div className="stat">
          <div className="eyebrow">{t.setsLabel}</div>
          <div className="stat-val">{t.sets}</div>
        </div>
        <div className="stat">
          <div className="eyebrow">{t.volumeLabel}</div>
          <div className="stat-val">{t.volume}</div>
        </div>
      </div>
      <button type="button" className="btn primary" onClick={() => setSharing(true)}>
        <Icon name="share" size={18} /> Share workout
      </button>
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
      {sharing && <ShareSheet session={s} onClose={() => setSharing(false)} />}
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

/** Preview of the workout image, with the share sheet (WhatsApp, Messages, Save Image) and a download. */
function ShareSheet({ session, onClose }: { session: Session; onClose: () => void }) {
  const { entry, notify } = useStore()
  const [file, setFile] = useState<File>()
  const [src, setSrc] = useState<string>()
  useEffect(() => {
    let url: string | undefined
    workoutImage(session, entry)
      .then((blob) => {
        const day = new Date(session.startedAt).toISOString().slice(0, 10)
        setFile(new File([blob], `workout-${day}.png`, { type: 'image/png' }))
        setSrc((url = URL.createObjectURL(blob)))
      })
      .catch(() => notify('Could not make the image'))
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [session.id])

  const canShare = !!file && !!navigator.canShare?.({ files: [file] })
  const share = async () => {
    if (!file) return
    try {
      await navigator.share({ files: [file], title: session.name })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') notify('Sharing did not work. Try Download image.')
    }
  }
  const download = () => {
    if (!file || !src) return
    const a = document.createElement('a')
    a.href = src
    a.download = file.name
    a.click()
    notify('Image downloaded')
  }

  return (
    <Sheet open onClose={onClose} title="Share workout">
      <div className="share-preview">{src ? <img src={src} alt={`Workout summary: ${session.name}`} /> : <div className="photo-ph" />}</div>
      <div className="share-actions">
        {canShare && (
          <button type="button" className="btn primary" onClick={share}>
            <Icon name="share" size={18} /> Share
          </button>
        )}
        <button type="button" className={'btn ' + (canShare ? 'ghost' : 'primary')} disabled={!file} onClick={download}>
          <Icon name="download" size={18} /> Download image
        </button>
      </div>
    </Sheet>
  )
}
