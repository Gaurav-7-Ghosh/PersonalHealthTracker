# Notes for Claude sessions

Start with [docs/HANDOFF.md](docs/HANDOFF.md), which covers context, decisions, open items and next steps. Then read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/FLOWS.md](docs/FLOWS.md).

- Constraints: zero cost, offline-first, and data lives on the device. Optional sync goes only to Gaurav's own free Supabase project (see docs/SYNC.md).
- Check: `npm run typecheck && npm run build && npm run smoke`. If Playwright can't find its own browser, set `CHROMIUM=<path>`.
- Preview for claude.ai: `npm run build:artifact` builds `dist-artifact/artifact.html`.
- Update `docs/HANDOFF.md` when decisions or open items change.
