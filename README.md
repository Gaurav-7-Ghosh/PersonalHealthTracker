# Personal Health Tracker

A personal, offline-first workout companion that runs in the browser and installs to the iPhone Home Screen. It keeps your exercise and mobility library with form cards (key cues plus Start, Mid and End photos), your saved video links by label, routines, set logging, busy-station swaps and a home HIIT timer. Everything is stored on the device in IndexedDB; there is no server and no account.

Spec: see the SRS doc in the Workout and Lifestyle project. This version covers SRS sections 2.1 to 2.5.

Docs: [Architecture](docs/ARCHITECTURE.md) · [User flows](docs/FLOWS.md) · [Handoff, decisions and open items](docs/HANDOFF.md) · [Changelog](CHANGELOG.md)

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck
npm run build        # dist/: one self-contained index.html + manifest + service worker
npm run smoke        # click-through test at iPhone size against the build (needs Playwright's Chromium)
```

## Deploy (GitHub Pages, free)

`.github/workflows/deploy.yml` type-checks, builds and runs the smoke test on every push and pull request, and publishes `main` to GitHub Pages.

1. One time: in the repo on GitHub, open Settings > Pages and set Source to **GitHub Actions**.
2. Push to `main` (or re-run the latest "Build and deploy" run from the Actions tab).
3. The site is at `https://<user>.github.io/PersonalHealthTracker/`.
4. On the iPhone, open that address in Safari, then Share > Add to Home Screen. The service worker caches the app so it opens with no signal.

Data lives on each device, so a new deploy never touches it. Save a backup from Settings before clearing Safari data.

## Releases

The version comes from `package.json` and shows at the bottom of Settings. To cut a release: update `CHANGELOG.md`, run `npm version <x.y.z>` (bumps `package.json`, commits and tags `v<x.y.z>`), then `git push --follow-tags`.

`npm run build:artifact` produces `dist-artifact/artifact.html`, a variant that loads React from cdnjs. It only exists for the claude.ai preview page.

## Layout

```
src/
  types.ts        data model (Entry, Routine, Session, ...)
  db.ts           IndexedDB wrapper; falls back to memory if storage is blocked
  store.tsx       React context: in-memory state, write-through to IndexedDB, navigation stack
  seed.ts         starter library (about 80 entries), flagged sample: true; no preset routines
  taxonomy.ts     regions, muscles, equipment, movement patterns, labels
  swap.ts         swap ranking: 0.55 muscle cosine + 0.25 pattern + 0.1 loading + 0.1 recent use
  util.ts         ids, image resize and crop (1600 px JPEG), YouTube thumbnails, beeps, wake lock
  components/     Icon, BodyMap, FormCard, Ink (photo drawing, crop, full-screen view),
                  LinkThumb, shared UI (Sheet, Stepper, RenameSheet, ...)
  screens/        Today, StartWorkout (body map, muscles, exercise list), Library,
                  EntryView, EntryEdit, FormEdit, Capture (+ inbox), Routines,
                  Session (+ swap sheet), Hiit (+ player), History, Settings
public/           manifest, icon, service worker
scripts/          smoke test, artifact build step
```

Navigation is an in-memory stack in the store (no router dependency); tabs reset the stack.

## Data

- Entries hold `cues`, `photos` (blob ids in the `photos` store, tagged setup/start/mid/end/other, each with a note and optional `ink`), labeled `links` and `notes`, muscles with roles, equipment and movement pattern.
- `ink` is the drawing on a photo (pen, line, arrow, text) stored as shapes in the photo's pixel space, so it stays sharp and editable. The form card editor (`src/screens/FormEdit.tsx`, `src/components/Ink.tsx`) adds photos by file or paste, reorders, crops, draws and edits notes.
- `npm run smoke` takes `FORM_SHOTS=<folder>` to test the form card editor with real screenshots instead of generated stand-ins.
- The active session is saved on every change under `meta/active`, so closing the app mid-workout loses nothing.
- Settings > Save backup exports everything, photos included, as one JSON file; Restore replaces the device's data with a backup.

## Share sheet capture (iPhone)

Opening the app with `?url=<encoded link>&title=<optional>` goes straight to Save a link. Settings explains how to wire this to an Apple Shortcut so Instagram and Safari can share into the app.
