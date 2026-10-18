# Personal Health Tracker

A personal, offline-first workout companion that runs in the browser and installs to the iPhone Home Screen. It keeps your exercise and mobility library with form cards (key cues plus Start, Mid and End photos), your saved video links by label, routines, set logging, busy-station swaps and a home HIIT timer. Everything is stored on the device in IndexedDB; there is no server and no account.

Spec: see the SRS doc in the Workout and Lifestyle project. This version covers SRS sections 2.1 to 2.5.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck
npm run build        # dist/: one self-contained index.html + manifest + service worker
npm run smoke        # click-through test at iPhone size against the build (needs Playwright's Chromium)
```

To use it on your phone, host `dist/` on any static host with HTTPS (GitHub Pages works), open it in Safari, then Share > Add to Home Screen. The service worker caches the app so it opens with no signal.

`npm run build:artifact` produces `dist-artifact/artifact.html`, a variant that loads React from cdnjs. It only exists for the claude.ai preview page.

## Layout

```
src/
  types.ts        data model (Entry, Routine, Session, ...)
  db.ts           IndexedDB wrapper; falls back to memory if storage is blocked
  store.tsx       React context: in-memory state, write-through to IndexedDB, navigation stack
  seed.ts         starter library (about 70 entries) and 6 routines, flagged sample: true
  taxonomy.ts     regions, muscles, equipment, movement patterns, labels
  swap.ts         swap ranking: 0.55 muscle cosine + 0.25 pattern + 0.1 loading + 0.1 recent use
  util.ts         ids, image resize (1080 px JPEG), YouTube oEmbed, beeps, wake lock
  components/     Icon, FormCard, shared UI (Sheet, Stepper, EntryPicker, ...)
  screens/        Today, Library, EntryView, EntryEdit, Capture (+ inbox), Routines,
                  Session (+ swap sheet), Hiit (+ player), History, Settings
public/           manifest, icon, service worker
scripts/          smoke test, artifact build step
```

Navigation is an in-memory stack in the store (no router dependency); tabs reset the stack.

## Data

- Entries hold `cues`, `photos` (blob ids in the `photos` store, tagged setup/start/mid/end/other), labeled `links` and `notes`, muscles with roles, equipment and movement pattern.
- The active session is saved on every change under `meta/active`, so closing the app mid-workout loses nothing.
- Settings > Save backup exports everything, photos included, as one JSON file; Restore replaces the device's data with a backup.

## Share sheet capture (iPhone)

Opening the app with `?url=<encoded link>&title=<optional>` goes straight to Save a link. Settings explains how to wire this to an Apple Shortcut so Instagram and Safari can share into the app.
