import type { Kind, Measure, PhotoPosition } from './types'

export const REGIONS: { name: string; muscles: string[] }[] = [
  { name: 'Chest', muscles: ['Upper chest', 'Mid chest', 'Lower chest', 'Serratus anterior', 'Pec minor'] },
  { name: 'Shoulders', muscles: ['Front delt', 'Side delt', 'Rear delt', 'Rotator cuff'] },
  { name: 'Back', muscles: ['Lats', 'Upper traps', 'Mid back', 'Lower traps', 'Lower back', 'Thoracic spine'] },
  { name: 'Arms', muscles: ['Biceps', 'Brachialis', 'Triceps', 'Forearms'] },
  { name: 'Core', muscles: ['Upper abs', 'Lower abs', 'Obliques', 'Deep core'] },
  { name: 'Glutes and hips', muscles: ['Glute max', 'Glute med', 'Hip flexors', 'Adductors', 'Piriformis'] },
  { name: 'Legs', muscles: ['Quads', 'Hamstrings', 'Calves', 'Tibialis', 'Ankle'] },
  { name: 'Neck', muscles: ['Upper traps', 'Levator scapulae', 'Neck flexors'] },
  { name: 'Full body', muscles: ['Conditioning'] },
]

export const regionsOfMuscle = (m: string) => REGIONS.filter((r) => r.muscles.includes(m)).map((r) => r.name)

export const EQUIPMENT = [
  'Barbell',
  'Dumbbell',
  'Bench',
  'Rack',
  'Smith machine',
  'Machine',
  'Cable',
  'Pull-up bar',
  'Dip station',
  'Kettlebell',
  'Band',
  'Foam roller',
  'Bodyweight',
]

export const PATTERNS = [
  'Horizontal push',
  'Incline push',
  'Decline push',
  'Vertical push',
  'Horizontal pull',
  'Vertical pull',
  'Squat',
  'Lunge',
  'Hinge',
  'Chest fly',
  'Shoulder raise',
  'Rear delt',
  'Elbow flexion',
  'Elbow extension',
  'Knee flexion',
  'Knee extension',
  'Calf raise',
  'Core',
]

// Pairs of patterns that train similar things; used to score swaps.
const RELATED: [string, string][] = [
  ['Horizontal push', 'Incline push'],
  ['Incline push', 'Vertical push'],
  ['Horizontal push', 'Chest fly'],
  ['Horizontal push', 'Decline push'],
  ['Horizontal pull', 'Vertical pull'],
  ['Horizontal pull', 'Rear delt'],
  ['Squat', 'Lunge'],
  ['Squat', 'Knee extension'],
  ['Hinge', 'Knee flexion'],
  ['Vertical push', 'Shoulder raise'],
]

export function patternMatch(a?: string, b?: string): number {
  if (!a || !b) return 0
  if (a === b) return 1
  return RELATED.some(([x, y]) => (x === a && y === b) || (x === b && y === a)) ? 0.5 : 0
}

export const KINDS: { id: Kind; label: string; plural: string }[] = [
  { id: 'strength', label: 'Strength', plural: 'Strength' },
  { id: 'mobility', label: 'Mobility', plural: 'Mobility' },
  { id: 'stretch', label: 'Stretch', plural: 'Stretches' },
  { id: 'warmup', label: 'Warm-up', plural: 'Warm-ups' },
  { id: 'hiit', label: 'HIIT move', plural: 'HIIT' },
]

export const kindLabel = (k: Kind) => KINDS.find((x) => x.id === k)?.label ?? k

export const MEASURES: { id: Measure; label: string }[] = [
  { id: 'weight_reps', label: 'Weight and reps' },
  { id: 'reps', label: 'Reps only' },
  { id: 'hold', label: 'Hold time' },
  { id: 'time', label: 'Timed interval' },
]

export const defaultMeasure = (k: Kind): Measure =>
  k === 'strength' ? 'weight_reps' : k === 'stretch' ? 'hold' : k === 'hiit' ? 'time' : 'reps'

export const POSITIONS: { id: PhotoPosition; label: string }[] = [
  { id: 'setup', label: 'Setup' },
  { id: 'start', label: 'Start' },
  { id: 'mid', label: 'Mid' },
  { id: 'end', label: 'End' },
  { id: 'other', label: 'Other' },
]

export const LINK_LABELS = ['Proper form', 'What to focus on', 'Common mistakes', 'Variations', 'Programming', 'Recipe']
export const NOTE_LABELS = ['What to focus on', 'Common mistakes', 'What worked', 'Pain or caution']

export function platformOf(url: string): string {
  try {
    const h = new URL(url).hostname.replace(/^www\.|^m\./, '')
    if (h.includes('youtube') || h === 'youtu.be') return 'YouTube'
    if (h.includes('instagram')) return 'Instagram'
    if (h.includes('tiktok')) return 'TikTok'
    return h
  } catch {
    return 'Link'
  }
}
