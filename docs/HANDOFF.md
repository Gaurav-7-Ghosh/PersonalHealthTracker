# Handoff and project context

Last updated 2026-10-18 (0.1.0 plus bookmarks). This file carries the context between working sessions, so a new session can pick up from the repo alone.

## What this is

A personal app for Gaurav to:
- track workouts
- keep an exercise and mobility knowledge base (form cards, saved video links, notes)
- swap exercises when a station is busy
- run home HIIT

Later it will add meal plans and macros, and Garmin data. It's a senior developer's personal project, reviewed and run from VS Code.

- **Spec:** the SRS lives as a document in the claude.ai project "Workout and Lifestyle": https://claude.ai/artifact/G4BB5i5SoDfvzt4nQg7wru. Version 0.1.0 covers SRS sections 2.1 to 2.5.
- **Live app:** https://gaurav-7-ghosh.github.io/PersonalHealthTracker/ (GitHub Pages; installed to the iPhone Home Screen).
- **Preview used during development:** https://claude.ai/artifact/MVtofd5RAtd6RptSetGL6E (the same app, built with `npm run build:artifact`).

## Decisions so far (and why)

| Decision | Reason |
|---|---|
| Zero cost: no server of our own, no paid services | Gaurav's hard constraint |
| Optional sync through his own free Supabase project, hand-written `fetch` client, email + password sign-in | Phone and Mac share data and photos; no library in the bundle; magic links would sign in Safari, not the Home Screen app |
| Offline-first PWA: one HTML file, service worker, IndexedDB | Gym has poor signal; nothing should need loading mid-set |
| Home screen is blank, no preset plans | Gaurav trains by feel; he picks what to do each day |
| Start workout: body map, then muscle, then exercises with equipment filter chips | His requested flow; both sides of a muscle are one target; back view for back muscles and hamstrings |
| He creates his own exercises; starter entries are editable or removable defaults | Open exercise datasets are out of date |
| Form cards hold screenshots as-is (OneNote, video stills) with headings, notes, drawings and crop | His OneNote pages are annotated screenshots; he uses them as a refresher, not to learn |
| Links are key-value: label (Proper form, What to focus on, ...) to URL | How he organises saved YouTube and Instagram videos |
| Typed weights and reps, with a Last time card | Faster than tapping + and − |
| Bookmarks on any exercise, listed by section (kind), plus your own named lists | To keep the drills he finds (with notes and links) easy to get back to, grouped his way (for example "Morning mobility") |
| Instagram and TikTok get a manual cover image | They don't share thumbnails without a developer account |
| GitHub Pages, public repo | Free hosting; data never leaves the phone, only the code is public |
| No router or state library; one `store.tsx` | Small app; fewer dependencies to keep offline |

## What 0.1.0 contains

See [CHANGELOG.md](../CHANGELOG.md), [ARCHITECTURE.md](ARCHITECTURE.md) and [FLOWS.md](FLOWS.md). In short:
- the body map start flow
- the library with about 80 starter entries
- form cards with a drawing and crop editor and full-screen zoom
- labeled links with thumbnails and covers
- share-sheet capture and inbox
- session logging with Last time, rest timer and swaps
- the Home HIIT timer
- history
- backup and restore

## Since 0.1.0 (on `main`, not yet released)

- Bookmarks: a bookmark button on the exercise page and in sessions, a Bookmarks screen from Today grouped by section, a Bookmarked filter in the library, and markers in lists.
- Named lists: the bookmark button opens "Save to", where an exercise can go into your own lists. Lists can be created, renamed and deleted, and appear on the Bookmarks screen, as library filter chips, and as tags on the exercise page.
- Sync between devices through Supabase (optional, free tier). See [SYNC.md](SYNC.md). Gaurav creates the Supabase project himself and signs in on each device.
- Fix: sheets now open above the tab bar on every screen.
- Release these as 0.2.0 when ready (see Releases in the README).

## Deploy setup

- **Workflow:** `.github/workflows/deploy.yml` runs on every push and pull request: `npm ci`, typecheck, build and the smoke test. Pushes to `main` also deploy `dist/` to GitHub Pages.
- **Repo settings:** the repo is public, and Settings → Pages → Source is set to "GitHub Actions".
- **Version:** comes from `package.json` and shows in Settings. To release, update the changelog, run `npm version x.y.z`, then `git push --follow-tags`.

## Open items

1. **Tag `v0.1.0`.** Claude's environment can't push tags, so Gaurav runs `git pull && git tag -a v0.1.0 -m "0.1.0" && git push origin v0.1.0`. Optionally draft a GitHub release from the changelog.
2. **Shorter address (optional, free).** Either rename the repo (for example `fit`, giving `gaurav-7-ghosh.github.io/fit`) or use Cloudflare Pages or Netlify for `name.pages.dev` or `name.netlify.app`. Moving address means a backup and restore, because data is tied to the address. Not decided yet.
3. **OneNote import (not built).** Options: Microsoft Graph API (needs Microsoft sign-in and network), or on-device text recognition with Tesseract.js (adds a few MB). Today he copies text with iPhone Live Text and pastes it into cues.
4. **Garmin (SRS, later).** Gaurav has a Garmin watch on the way. Pulling data from Garmin Connect for free means a manual export and import, or an unofficial client. The official Garmin Connect Developer Program requires approval. Revisit when the watch arrives.
5. **Meals, recipes, macros and weight (SRS, later).** Daily intake entries with rough estimates, recipe links, the shop links where he bought items, and weigh-ins from his scale.
6. **Routines.** The screens still exist and can be reached from Today when any routine exists, but there are no presets by design. Decide whether to keep or remove them.

## Next steps (suggested)

- Use 0.1.0 in the gym for a week or two and collect friction points.
- Then pick the next SRS slice: probably nutrition (macros and weight), or Garmin once the watch arrives.

## Working conventions

- **Code:** TypeScript strict, React function components, and no new runtime dependencies without a reason. Styles go in `styles.css` using the existing tokens.
- **Testing:** run `npm run typecheck && npm run build && npm run smoke` before pushing. Add a smoke step for any new flow.
- **Starter data:** bump `SEED_VERSION` in `store.tsx` when `seed.ts` changes in a way existing installs should receive.
- **Commits:** small and descriptive, pushed to `main` (single-developer repo).
