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
  /** Daily calorie target shown on the Health screen. */
  kcalGoal: number
  /** Your own daily limits or targets per nutrient. Missing keys use the defaults in nutrition.ts. */
  nutrientGoals?: Partial<Record<Exclude<NutrientKey, 'kcal'>, number>>
}

export interface NamedList {
  id: string
  name: string
  createdAt: number
}

/**
 * Nutrition for some amount of a food. kcal is required; the rest are optional, as printed on the label.
 * Grams, except sodium and cholesterol in mg. To add a marker, add it here and to NUTRIENTS in nutrition.ts.
 */
export interface Nutrients {
  kcal: number
  protein?: number
  carbs?: number
  /** Total sugars, natural and added. */
  sugar?: number
  /** Added sugars, as Indian (FSSAI) labels print them. */
  addedSugar?: number
  fibre?: number
  fat?: number
  satFat?: number
  transFat?: number
  cholesterol?: number
  sodium?: number
}

export type NutrientKey = keyof Nutrients

/** Grams, millilitres, pieces for things eaten whole (1 Kathi roll, 1 samosa), or servings of a recipe (1 cup of coffee). */
export type FoodUnit = 'g' | 'ml' | 'pc' | 'srv'
/**
 * How an ingredient is measured in a recipe: the food's own unit, spoons (1 tbsp = 3 tsp), or the food's
 * own portion (`portion`: 1 roti, 2 eggs), which counts as `serving.amount` grams each.
 */
export type IngredientMeasure = 'g' | 'ml' | 'pc' | 'tsp' | 'tbsp' | 'portion'

/** One ingredient line of a recipe, e.g. 1 tbsp of instant coffee. `name` is kept in case the food is deleted later. */
export interface RecipeItem {
  foodId: string
  name: string
  qty: number
  measure: IngredientMeasure
}

/** A recipe is a food made of other foods. Its `n` is worked out from the ingredients for one serving. */
export interface Recipe {
  items: RecipeItem[]
  /** How many servings the ingredients make: 1 for a cup of coffee, 4 for a pot of dal. */
  servings: number
}
export type Meal = 'breakfast' | 'lunch' | 'snack' | 'dinner'

/**
 * A food or drink you eat: a starter item, or your own with its brand and a photo of the pack.
 * `n` is the nutrition for `per` grams (or ml), exactly as the label prints it (per 100 g, per 30 g serving, ...).
 */
export interface Food {
  id: string
  name: string
  brand?: string
  /** Photo id in the photos store, to tell packs apart at a glance. */
  photo?: string
  unit: FoodUnit
  per: number
  n: Nutrients
  /** Grams (or ml) in one level teaspoon, for measuring this food by the spoon in recipes. */
  tsp?: number
  /** Set when this food is a recipe of other foods; then unit is 'srv' and per is 1. */
  recipe?: Recipe
  /** A handy portion, e.g. 1 roti = 40 g. */
  serving?: { label: string; amount: number }
  /** Where starter values came from. */
  source?: string
  sample?: boolean
  createdAt: number
  updatedAt: number
}

/** One thing eaten on a day. Keeps a copy of the food's label values, so editing a food later doesn't rewrite past days. */
export interface FoodLog {
  id: string
  /** Local calendar day, YYYY-MM-DD; a new day starts at midnight on the device. */
  day: string
  meal: Meal
  foodId: string
  name: string
  brand?: string
  unit: FoodUnit
  amount: number
  per: number
  /** Nutrition per `per`, copied from the food when logged. */
  base: Nutrients
  /** For a recipe: the mix used this time (3 tbsp coffee + 100 ml water), as logged. */
  mix?: RecipeItem[]
  at: number
  updatedAt: number
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
  | { name: 'health' }
  | { name: 'foods'; day?: string; meal?: Meal; pick?: string }
  | { name: 'foodEdit'; id?: string; day?: string; meal?: Meal }
  | { name: 'recipeEdit'; id?: string; day?: string; meal?: Meal }
