// Ranks alternatives for an exercise whose station is busy.
// Score = 0.55 muscle match + 0.25 movement pattern + 0.1 loading type + 0.1 recent history.
import type { Entry, Session } from './types'
import { patternMatch } from './taxonomy'

const W = { primary: 1, secondary: 0.5, stabiliser: 0.2 }

function vector(e: Entry) {
  const v = new Map<string, number>()
  for (const m of e.muscles) v.set(m.name, Math.max(v.get(m.name) ?? 0, W[m.role]))
  return v
}

function cosine(a: Map<string, number>, b: Map<string, number>) {
  let dot = 0
  let na = 0
  let nb = 0
  for (const [k, x] of a) {
    na += x * x
    dot += x * (b.get(k) ?? 0)
  }
  for (const x of b.values()) nb += x * x
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

export interface SwapOption {
  entry: Entry
  score: number
  pinned: boolean
  reasons: string[]
  tier: 'Pinned by you' | 'Closest match' | 'Same muscles, new angle' | 'Other options'
}

export function rankSwaps(
  from: Entry,
  all: Entry[],
  opts: { busy: string[]; recent: Set<string>; exclude?: Set<string>; limit?: number },
): SwapOption[] {
  const fv = vector(from)
  const fromPrimary = new Set(from.muscles.filter((m) => m.role === 'primary').map((m) => m.name))
  const usable = (e: Entry) => !e.equipment.some((q) => opts.busy.includes(q))
  const out: SwapOption[] = []
  for (const e of all) {
    if (e.id === from.id || opts.exclude?.has(e.id)) continue
    const pinned = from.pinnedSwaps.includes(e.id)
    if (!pinned && e.kind !== from.kind) continue
    if (!usable(e)) continue
    const m = cosine(fv, vector(e))
    if (!pinned && m < 0.3) continue
    const p = patternMatch(from.pattern, e.pattern)
    const l = (from.compound ?? false) === (e.compound ?? false) ? 1 : 0
    const h = opts.recent.has(e.id) ? 1 : 0
    const score = pinned ? 1 : 0.55 * m + 0.25 * p + 0.1 * l + 0.1 * h
    if (!pinned && score < 0.35) continue
    const reasons: string[] = []
    const shared = e.muscles.filter((x) => x.role === 'primary' && fromPrimary.has(x.name)).map((x) => x.name)
    if (shared.length) reasons.push(shared.join(', '))
    if (p === 1) reasons.push('same movement')
    else if (p === 0.5) reasons.push('related movement')
    if (h) reasons.push('done recently')
    if (e.equipment.length) reasons.push(e.equipment.filter((q) => q !== 'Bodyweight').join(', ') || 'bodyweight')
    out.push({
      entry: e,
      score,
      pinned,
      reasons,
      tier: pinned ? 'Pinned by you' : score >= 0.8 ? 'Closest match' : score >= 0.6 ? 'Same muscles, new angle' : 'Other options',
    })
  }
  out.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.score - a.score)
  return out.slice(0, opts.limit ?? 10)
}

export function recentEntryIds(sessions: Session[], days = 90): Set<string> {
  const cut = Date.now() - days * 864e5
  const s = new Set<string>()
  for (const x of sessions) if (x.startedAt >= cut) for (const i of x.items) s.add(i.entryId)
  return s
}
