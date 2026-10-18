export type Kind = 'strength' | 'mobility' | 'stretch' | 'warmup' | 'hiit'
export type Measure = 'weight_reps' | 'reps' | 'hold' | 'time'
export type Role = 'primary' | 'secondary' | 'stabiliser'
export type PhotoPosition = 'setup' | 'start' | 'mid' | 'end' | 'other'

export interface MuscleRef {
  name: string
  role: Role
}

export interface PhotoRef {
  id: string
  position: PhotoPosition
  caption?: string
}

export interface LinkRef {
  id: string
  label: string
  url: string
  title?: string
  thumb?: string
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
  seeded: boolean
}

export type Route =
  | { name: 'today' }
  | { name: 'library' }
  | { name: 'entry'; id: string }
  | { name: 'edit'; id?: string; kind?: Kind }
  | { name: 'capture'; url?: string; title?: string; inboxId?: string }
  | { name: 'routines' }
  | { name: 'routine'; id?: string; type?: RoutineType }
  | { name: 'session' }
  | { name: 'hiit'; routineId?: string }
  | { name: 'history' }
  | { name: 'sessionDetail'; id: string }
  | { name: 'settings' }
