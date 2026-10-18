import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { Confirm, Stepper } from '../components/ui'
import * as db from '../db'
import { useStore } from '../store'
import type { Entry, InboxItem, Routine, Session, Settings as SettingsT } from '../types'
import { blobToDataUrl, dataUrlToBlob, savePhoto } from '../util'

interface Backup {
  app: 'workout-companion'
  version: 1
  exportedAt: string
  entries: Entry[]
  routines: Routine[]
  sessions: Session[]
  inbox: InboxItem[]
  settings: SettingsT
  photos: Record<string, string>
}

export function Settings() {
  const store = useStore()
  const { settings, saveSettings, entries, routines, sessions, inbox, notify, reload } = store
  const [usage, setUsage] = useState<string>()
  const [persisted, setPersisted] = useState<boolean>()
  const [pending, setPending] = useState<Backup | null>(null)
  const [removeSamples, setRemoveSamples] = useState(false)
  const [wipe, setWipe] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const appUrl = location.origin + location.pathname

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setUsage(`${((e.usage ?? 0) / 1e6).toFixed(1)} MB used`)).catch(() => {})
    navigator.storage?.persisted?.().then(setPersisted).catch(() => {})
  }, [])

  const exportBackup = async () => {
    const photos: Record<string, string> = {}
    for (const id of await db.allKeys('photos')) {
      const b = await db.get<Blob>('photos', id)
      if (b) photos[id] = await blobToDataUrl(b)
    }
    const data: Backup = { app: 'workout-companion', version: 1, exportedAt: new Date().toISOString(), entries, routines, sessions, inbox, settings, photos }
    const name = `workout-backup-${new Date().toISOString().slice(0, 10)}.json`
    const file = new File([JSON.stringify(data)], name, { type: 'application/json' })
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: name })
        notify('Backup ready')
        return
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(file)
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
    notify('Backup downloaded')
  }

  const readBackup = async (f: File | undefined) => {
    if (!f) return
    try {
      const data = JSON.parse(await f.text()) as Backup
      if (data.app !== 'workout-companion') throw new Error('not a backup')
      setPending(data)
    } catch {
      notify('That file is not a backup from this app')
    }
  }

  const restore = async (b: Backup) => {
    await db.clearAll()
    for (const e of b.entries) await db.put('entries', e.id, e)
    for (const r of b.routines) await db.put('routines', r.id, r)
    for (const s of b.sessions) await db.put('sessions', s.id, s)
    for (const i of b.inbox) await db.put('inbox', i.id, i)
    for (const [id, d] of Object.entries(b.photos)) await savePhoto(id, await dataUrlToBlob(d))
    await db.put('meta', 'settings', { ...b.settings, seeded: true })
    await reload()
    notify('Backup restored')
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      notify('Copied')
    } catch {
      notify('Select the address and copy it')
    }
  }

  return (
    <div className="screen form">
      <header className="hero">
        <h1>Settings</h1>
      </header>

      <section className="block">
        <h2>Timers and steps</h2>
        <div className="grid-3">
          <Stepper label="Rest, strength" unit="s" step={15} value={settings.restStrength} onChange={(v) => saveSettings({ restStrength: v })} />
          <Stepper label="Rest, mobility" unit="s" step={5} value={settings.restMobility} onChange={(v) => saveSettings({ restMobility: v })} />
          <Stepper label="Weight step" unit="kg" step={0.5} min={0.5} value={settings.weightStep} onChange={(v) => saveSettings({ weightStep: v })} />
        </div>
        {settings.busyEquipment.length > 0 && (
          <p className="muted small">
            Marked busy today: {settings.busyEquipment.join(', ')}.{' '}
            <button type="button" className="link-btn" onClick={() => saveSettings({ busyEquipment: [] })}>
              Clear
            </button>
          </p>
        )}
      </section>

      <section className="block">
        <h2>Backup</h2>
        <p className="muted">
          Everything lives on this device. Save a backup to iCloud Drive every week or so, and before you clear Safari data. Photos are included.
        </p>
        <div className="row-2">
          <button type="button" className="btn primary" onClick={exportBackup}>
            <Icon name="download" size={18} /> Save backup
          </button>
          <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={18} /> Restore
          </button>
        </div>
        <input ref={fileRef} id="restore-file" type="file" accept="application/json,.json" hidden onChange={(e) => readBackup(e.target.files?.[0]).then(() => (e.target.value = ''))} />
        <p className="muted small">
          {entries.length} entries · {routines.length} routines · {sessions.length} sessions{usage ? ` · ${usage}` : ''}
          {persisted === false && (
            <>
              {' · '}
              <button
                type="button"
                className="link-btn"
                onClick={async () => {
                  const ok = await navigator.storage?.persist?.()
                  setPersisted(!!ok)
                  notify(ok ? 'Storage protected' : 'Add the app to your Home Screen first')
                }}
              >
                Protect storage
              </button>
            </>
          )}
        </p>
      </section>

      <section className="block">
        <h2>Save links from the share sheet</h2>
        <p className="muted">One-time setup on iPhone with the free Shortcuts app:</p>
        <ol className="steps">
          <li>Open Shortcuts, tap +, and name it "Save to Workout".</li>
          <li>Tap the info button and turn on "Show in Share Sheet". Set it to receive URLs and Safari web pages.</li>
          <li>Add the action "URL Encode" with Shortcut Input.</li>
          <li>
            Add "Open URLs" with this address, then insert the URL Encoded Text at the end:
            <code className="copyable">{appUrl}?url=</code>
            <button type="button" className="btn small ghost" onClick={() => copy(appUrl + '?url=')}>
              Copy address
            </button>
          </li>
          <li>In Instagram or Safari, tap Share, then "Save to Workout". The app opens with the link ready to label.</li>
        </ol>
      </section>

      <section className="block">
        <h2>Starter data</h2>
        <p className="muted">The app came with common exercises, stretches, HIIT moves and a few routines. Your own entries are never touched by this.</p>
        <button type="button" className="btn ghost" onClick={() => setRemoveSamples(true)}>
          Remove untouched starter entries
        </button>
        <button type="button" className="btn danger-ghost" onClick={() => setWipe(true)}>
          Erase everything on this device
        </button>
      </section>

      <Confirm
        open={!!pending}
        title="Replace everything with this backup?"
        body={pending ? `From ${new Date(pending.exportedAt).toLocaleString()}: ${pending.entries.length} entries, ${pending.sessions.length} sessions. What's on this device now is replaced.` : ''}
        action="Restore backup"
        danger
        onClose={() => setPending(null)}
        onConfirm={() => pending && restore(pending)}
      />
      <Confirm
        open={removeSamples}
        title="Remove starter entries?"
        body="Starter entries you haven't edited, and starter routines, are removed. Anything you changed or logged stays."
        action="Remove"
        onClose={() => setRemoveSamples(false)}
        onConfirm={async () => {
          const used = new Set(sessions.flatMap((s) => s.items.map((i) => i.entryId)))
          const custom = routines.filter((r) => !r.sample)
          for (const r of custom) r.items.forEach((i) => used.add(i.entryId))
          for (const r of routines.filter((r) => r.sample)) await store.deleteRoutine(r.id)
          let n = 0
          for (const e of entries)
            if (e.sample && e.updatedAt === e.createdAt && !used.has(e.id)) {
              await store.deleteEntry(e.id)
              n++
            }
          notify(`Removed ${n} starter entries`)
        }}
      />
      <Confirm
        open={wipe}
        title="Erase everything?"
        body="All entries, photos, routines and history on this device are deleted. Save a backup first if you might want them."
        action="Erase everything"
        danger
        onClose={() => setWipe(false)}
        onConfirm={async () => {
          await db.clearAll()
          await reload()
          notify('Erased. Starter data was added back.')
        }}
      />
    </div>
  )
}
