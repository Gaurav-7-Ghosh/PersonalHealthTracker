export type Kind = 'strength' | 'mobility' | 'stretch' | 'warmup' | 'hiit'
export type Measure = 'weight_reps' | 'reps' | 'hold' | 'time'
export type Role = 'primary' | 'secondary' | 'stabiliser'
export type PhotoPosition = 'setup' | 'start' | 'mid' | 'end' | 'other'

export interface MuscleRef {
  name: string
  role: Role
}

export type InkColor = string
export type InkMark =
  | { type: 'pen' | 'line' | 'arrow'; color: InkColor; pts: number[] }
  | { type: 'text'; color: InkColor; x: number; y: number; text: string }

/** Drawings on a photo, in the photo's own pixel space (w x h) so they scale with it. */
export interface Ink {
  w: number
  h: number
  marks: InkMark[]
}

export interface PhotoRef {
  id: string
  position: PhotoPosition
  /** What the frame shows, e.g. "Feet from the front"; shown above the photo. */
  title?: string
  /** Notes for this frame; shown under the photo. */
  caption?: string
  ink?: Ink
}

export interface LinkRef {
  id: string
  label: string
  url: string
  title?: string
  thumb?: string
  /** Your own cover image (a photo id), for sites like Instagram that don't share thumbnails. */
  cover?: string
}

export interface NoteRef {
  id: string
  label: string
  body: string
}

export interface Entry {
  id: string
  kind: Kind
  measure: Measure
  name: string
  regions: string[]
  muscles: MuscleRef[]
  equipment: string[]
  pattern?: string
  compound?: boolean
  cues: string[]
  photos: PhotoRef[]
  links: LinkRef[]
  notes: NoteRef[]
  /** Set when bookmarked; bookmarks are listed by section (kind), newest first. */
  bookmarkedAt?: number
  /** Ids of the named lists this entry is in. */
  lists?: string[]
  pinnedSwaps: string[]
  sample?: boolean
  createdAt: number
  updatedAt: number
}

export interface RoutineItem {
  entryId: string
  sets: number
  reps?: number
  weight?: number
  hold?: number
}

export type RoutineType = 'gym' | 'mobility' | 'hiit'

export interface Routine {
  id: string
  name: string
  type: RoutineType
  items: RoutineItem[]
  hiit?: { work: number; rest: number; rounds: number }
  sample?: boolean
  updatedAt: number
}

export interface SetLog {
  weight?: number
  reps?: number
  hold?: number
  tightness?: number
  at: number
}

export interface SessionItem {
  entryId: string
  swappedFrom?: string
  target: RoutineItem
  sets: SetLog[]
}

export interface Session {
  id: string
  name: string
  type: RoutineType
  routineId?: string
  startedAt: number
  endedAt?: number
  items: SessionItem[]
  current: number
  hiit?: { work: number; rest: number; rounds: number; roundsDone: number; seconds: number }
}

export interface InboxItem {
  id: string
  url: string
  title?: string
  createdAt: number
}

export interface Settings {
  restStrength: number
  restMobility: number
  weightStep: number
  busyEquipment: string[]
  seedVersion: number
  /** Your own named lists, e.g. "Morning mobility". Membership lives on Entry.lists. */
  lists: NamedList[]
}

export interface NamedList {
  id: string
  name: string
  createdAt: number
}

export type Route =
  | { name: 'today' }
  | { name: 'body' }
  | { name: 'region'; region: string }
  | { name: 'exercises'; region: string; muscle?: string }
  | { name: 'library' }
  | { name: 'bookmarks'; kind?: Kind }
  | { name: 'list'; id: string }
  | { name: 'entry'; id: string }
  | { name: 'formEdit'; id: string }
  | { name: 'edit'; id?: string; kind?: Kind; region?: string; muscle?: string; equipment?: string; returnBack?: boolean }
  | { name: 'capture'; url?: string; title?: string; inboxId?: string }
  | { name: 'routines' }
  | { name: 'routine'; id?: string; type?: RoutineType }
  | { name: 'session' }
  | { name: 'hiit'; routineId?: string }
  | { name: 'history' }
  | { name: 'sessionDetail'; id: string }
  | { name: 'settings' }
