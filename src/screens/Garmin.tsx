import { useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { Confirm, TopBar } from '../components/ui'
import { fmtDuration, mergeDay, readGarmin, sleepTotal } from '../garmin'
import { dayLabel, kcal, shiftDay, useToday } from '../nutrition'
import { useStore } from '../store'
import type { DayStats } from '../types'

/** Steps, calories burnt and sleep for one day, on the Health screen. Tap through to the Garmin screen. */
export function WatchCard({ day, eaten }: { day: string; eaten: number }) {
  const { wellness, go } = useStore()
  const d = wellness.get(day)
  if (!wellness.size)
    return (
      <button type="button" className="card watch-empty" onClick={() => go({ name: 'garmin' })}>
        <Icon name="steps" size={22} />
        <span>
          <span className="card-title">Garmin</span>
          <span className="muted small">Import steps, calories burnt and sleep score from your Garmin export.</span>
        </span>
        <Icon name="next" size={20} />
      </button>
    )
  return (
    <button type="button" className="card watch-card" aria-label="Garmin day" onClick={() => go({ name: 'garmin' })}>
      <span className="section-head">
        <span className="card-title">Garmin</span>
        <Icon name="next" size={20} />
      </span>
      {d ? (
        <>
          <WatchStats d={d} />
          {d.kcalTotal !== undefined && eaten > 0 && (
            <span className="muted small" data-testid="kcal-balance">
              Eaten {kcal(eaten)} of {kcal(d.kcalTotal)} kcal burnt: {kcal(Math.abs(d.kcalTotal - eaten))} {d.kcalTotal >= eaten ? 'under' : 'over'}
            </span>
          )}
        </>
      ) : (
        <span className="muted small">No Garmin data for this day yet. Import a newer export to fill it in.</span>
      )}
    </button>
  )
}

function WatchStats({ d }: { d: DayStats }) {
  const slept = d.sleep ? sleepTotal(d.sleep) : 0
  return (
    <span className="watch-stats">
      <span className="watch-stat" data-testid="garmin-steps">
        <span className="eyebrow">
          <Icon name="steps" size={14} /> Steps
        </span>
        <span className="stat-val">{d.steps !== undefined ? d.steps.toLocaleString() : '–'}</span>
        <span className="muted small">{d.stepGoal ? `goal ${d.stepGoal.toLocaleString()}` : ' '}</span>
      </span>
      <span className="watch-stat" data-testid="garmin-kcal">
        <span className="eyebrow">
          <Icon name="flame" size={14} /> Burnt
        </span>
        <span className="stat-val">{d.kcalTotal !== undefined ? kcal(d.kcalTotal) : '–'}</span>
        <span className="muted small">{d.kcalActive !== undefined ? `${kcal(d.kcalActive)} active` : 'kcal'}</span>
      </span>
      <span className="watch-stat" data-testid="garmin-sleep">
        <span className="eyebrow">
          <Icon name="moon" size={14} /> Sleep
        </span>
        <span className="stat-val">{d.sleep?.score ?? '–'}</span>
        <span className="muted small">{slept ? fmtDuration(slept) : 'score'}</span>
      </span>
    </span>
  )
}

const avg = (xs: (number | undefined)[]) => {
  const v = xs.filter((x): x is number => x !== undefined)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined
}

export function Garmin() {
  const { wellness, saveDays, clearDays, notify } = useStore()
  const today = useToday()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [wipe, setWipe] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const days = useMemo(() => [...wellness.values()].sort((a, b) => b.day.localeCompare(a.day)), [wellness])
  const week = useMemo(() => {
    const from = shiftDay(today, -7)
    const last = days.filter((d) => d.day >= from && d.day < today)
    return { steps: avg(last.map((d) => d.steps)), burnt: avg(last.map((d) => d.kcalTotal)), sleep: avg(last.map((d) => d.sleep?.score)), n: last.length }
  }, [days, today])

  const importFiles = async (list: FileList | null) => {
    const files = [...(list ?? [])]
    if (!files.length) return
    setBusy('Reading…')
    try {
      const { days: found } = await readGarmin(files, setBusy)
      if (!found.size) {
        notify('No steps or sleep found in that file')
        return
      }
      const now = Date.now()
      const next = [...found.values()].map((d) => mergeDay(wellness.get(d.day!), d, now))
      await saveDays(next)
      const keys = next.map((d) => d.day).sort()
      notify(`Imported ${keys.length} ${keys.length === 1 ? 'day' : 'days'}, ${dayLabel(keys[0], today)} to ${dayLabel(keys[keys.length - 1], today)}`)
    } catch (e) {
      notify((e as Error).message === 'not a zip' ? 'That file is not a Garmin export' : 'Could not read that file')
    } finally {
      setBusy(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const shown = showAll ? days : days.slice(0, 30)

  return (
    <div className="screen">
      <TopBar title="Garmin" sub="Steps, calories, sleep" />

      <section className="card" aria-label="Import">
        <div className="card-title">Import from Garmin Connect</div>
        <ol className="steps-list muted small">
          <li>
            On a computer or phone browser, sign in at connect.garmin.com, then open Account, Data Management, Export Your Data and tap Request Data Export.
          </li>
          <li>Garmin emails a download link, usually within a day or two. Save the zip to Files.</li>
          <li>Tap Import and pick the zip. It is read here on the phone; nothing is uploaded.</li>
        </ol>
        <p className="muted small">Import again any time to add newer days. You can also pick the UDSFile and sleepData JSON files on their own.</p>
        <input ref={fileRef} type="file" accept=".zip,.json,application/zip,application/json" multiple hidden aria-label="Garmin export file" onChange={(e) => importFiles(e.target.files)} />
        <button type="button" className="btn primary" disabled={!!busy} onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={18} /> {busy ?? 'Import Garmin export'}
        </button>
      </section>

      {days.length > 0 && (
        <>
          <section className="card" aria-label="Last 7 days">
            <div className="section-head">
              <span className="card-title">Last 7 days</span>
              <span className="muted small">average of {week.n} {week.n === 1 ? 'day' : 'days'}</span>
            </div>
            <span className="watch-stats">
              <span className="watch-stat">
                <span className="eyebrow">Steps</span>
                <span className="stat-val">{week.steps !== undefined ? Math.round(week.steps).toLocaleString() : '–'}</span>
              </span>
              <span className="watch-stat">
                <span className="eyebrow">Burnt</span>
                <span className="stat-val">{week.burnt !== undefined ? kcal(week.burnt) : '–'}</span>
              </span>
              <span className="watch-stat">
                <span className="eyebrow">Sleep</span>
                <span className="stat-val">{week.sleep !== undefined ? Math.round(week.sleep) : '–'}</span>
              </span>
            </span>
          </section>

          <section className="block" aria-label="Days">
            <div className="section-head">
              <h2>Days</h2>
              <span className="muted small">
                {days.length} imported · newest {dayLabel(days[0].day, today)}
              </span>
            </div>
            <ul className="list compact">
              {shown.map((d) => (
                <li key={d.day} className="watch-row">
                  <span className="list-main">
                    <span className="list-name">{dayLabel(d.day, today)}</span>
                    <span className="list-sub">{d.sleep && sleepTotal(d.sleep) ? `Slept ${fmtDuration(sleepTotal(d.sleep))}` : ' '}</span>
                  </span>
                  <span className="watch-cells">
                    <span title="Steps">{d.steps !== undefined ? d.steps.toLocaleString() : '–'}</span>
                    <span title="kcal burnt">{d.kcalTotal !== undefined ? kcal(d.kcalTotal) : '–'}</span>
                    <span title="Sleep score">{d.sleep?.score ?? '–'}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="muted small center">Steps · kcal burnt · sleep score</p>
            {days.length > shown.length && (
              <button type="button" className="btn ghost" onClick={() => setShowAll(true)}>
                Show all {days.length} days
              </button>
            )}
          </section>

          <button type="button" className="btn danger-ghost" onClick={() => setWipe(true)}>
            <Icon name="trash" size={18} /> Remove Garmin data
          </button>
        </>
      )}

      <Confirm
        open={wipe}
        title="Remove Garmin data?"
        body="Removes every imported day from this app. Your Garmin account and the export file are not touched; you can import again."
        action="Remove"
        danger
        onConfirm={async () => {
          await clearDays()
          notify('Garmin data removed')
        }}
        onClose={() => setWipe(false)}
      />
    </div>
  )
}
