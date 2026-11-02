// Daily calorie tracking helpers: local days, scaling label values to what you ate, and totals.
import { useEffect, useState } from 'react'
import type { Food, FoodLog, FoodUnit, IngredientMeasure, Meal, NutrientKey, Nutrients, RecipeItem, Settings } from './types'

/** max: stay under (sodium, sugar). min: reach at least (fibre). target: aim near (protein, carbs). */
export type GoalKind = 'max' | 'min' | 'target'

export interface NutrientInfo {
  key: NutrientKey
  label: string
  /** Name on the day card, where "of which" reads oddly. */
  short: string
  unit: 'kcal' | 'g' | 'mg'
  /** Printed under the line above it on a label (sugar under carbs, saturated under fat). */
  sub?: boolean
  kind?: GoalKind
  /** Default daily amount for a calorie goal. Changed per nutrient in Settings.nutrientGoals. */
  goal?: (kcalGoal: number) => number
  /** Where the default comes from, shown when editing limits. */
  why?: string
}

const pctKcal = (pct: number, kcalPerGram: number) => (kcalGoal: number) => (kcalGoal * pct) / 100 / kcalPerGram

/**
 * Every marker the app knows, in label order. Totals, scaling, the food form, the day card and the limits
 * sheet all loop over this list, so a new marker only needs adding here and to Nutrients in types.ts.
 * Defaults follow WHO guidance (and ICMR-NIN where it says the same), scaled to the calorie goal where
 * the guidance is a share of energy. They are general adult guides, not medical advice; edit them freely.
 */
export const NUTRIENTS: NutrientInfo[] = [
  { key: 'kcal', label: 'Calories', short: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', short: 'Protein', unit: 'g', kind: 'target', goal: pctKcal(20, 4), why: '20% of your calories. Lifting? Many aim for about 1.6 g per kg of body weight.' },
  { key: 'carbs', label: 'Carbs', short: 'Carbs', unit: 'g', kind: 'target', goal: pctKcal(50, 4), why: 'About half of your calories.' },
  { key: 'sugar', label: 'of which sugar', short: 'Sugar', unit: 'g', sub: true, kind: 'max', goal: pctKcal(18, 4), why: 'Total sugars, including milk and fruit: the 90 g reference intake on UK and EU labels, at 2,000 kcal.' },
  { key: 'addedSugar', label: 'of which added sugar', short: 'Added sugar', unit: 'g', sub: true, kind: 'max', goal: pctKcal(10, 4), why: 'WHO: under 10% of calories from added sugar, and under 5% is better.' },
  { key: 'fibre', label: 'Fibre', short: 'Fibre', unit: 'g', sub: true, kind: 'min', goal: (k) => (k / 1000) * 15, why: 'About 15 g per 1,000 kcal. WHO: at least 25 g a day.' },
  { key: 'fat', label: 'Fat', short: 'Fat', unit: 'g', kind: 'max', goal: pctKcal(30, 9), why: 'WHO: under 30% of calories from fat.' },
  { key: 'satFat', label: 'of which saturated', short: 'Saturated fat', unit: 'g', sub: true, kind: 'max', goal: pctKcal(10, 9), why: 'WHO: under 10% of calories.' },
  { key: 'transFat', label: 'of which trans fat', short: 'Trans fat', unit: 'g', sub: true, kind: 'max', goal: pctKcal(1, 9), why: 'WHO: under 1% of calories. Less is better.' },
  { key: 'cholesterol', label: 'Cholesterol', short: 'Cholesterol', unit: 'mg', kind: 'max', goal: () => 300, why: 'A common daily cap, used by ICMR-NIN.' },
  { key: 'sodium', label: 'Sodium', short: 'Sodium', unit: 'mg', kind: 'max', goal: () => 2000, why: 'WHO: under 2,000 mg sodium, which is 5 g of salt.' },
]

export const nutrientInfo = (key: NutrientKey) => NUTRIENTS.find((n) => n.key === key)!
/** The markers with a daily limit or target, in label order. */
export const TRACKED = NUTRIENTS.filter((n) => n.goal)

/** Rounded so the default reads well: 22 g, 2.2 g, 2,000 mg. */
export function defaultGoal(key: NutrientKey, kcalGoal: number): number {
  const g = nutrientInfo(key).goal?.(kcalGoal) ?? 0
  return g < 10 ? Math.round(g * 10) / 10 : Math.round(g)
}

/** Your own limit if you set one, otherwise the default for your calorie goal. */
export function nutrientGoal(key: NutrientKey, settings: Pick<Settings, 'kcalGoal' | 'nutrientGoals'>): number {
  if (key === 'kcal') return settings.kcalGoal
  return settings.nutrientGoals?.[key] ?? defaultGoal(key, settings.kcalGoal || 2000)
}

export type GoalState = 'none' | 'ok' | 'near' | 'over' | 'met'

/** How a day's amount sits against a goal: over a limit, near it (80%+), or a minimum reached. */
export function goalState(kind: GoalKind | undefined, value: number, goal: number): GoalState {
  if (!kind || !(goal > 0)) return 'none'
  if (kind === 'max') return value > goal ? 'over' : value >= goal * 0.8 ? 'near' : 'ok'
  return value >= goal ? 'met' : 'ok'
}

/** Logs whose label didn't give this value, so a total may be low. */
export const missingCount = (logs: FoodLog[], key: NutrientKey) => logs.filter((l) => l.base[key] === undefined).length

/** "12 g", "1.4 g", "1,850 mg", "420 kcal". */
export function fmtNutrient(value: number, unit: NutrientInfo['unit']): string {
  return unit === 'g' ? `${grams(value)} g` : `${Math.round(value).toLocaleString()} ${unit}`
}

export const MEALS: { id: Meal; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'snack', label: 'Snacks' },
  { id: 'dinner', label: 'Dinner' },
]
export const mealLabel = (m: Meal) => MEALS.find((x) => x.id === m)?.label ?? m

/** A guess at the meal from the time of day; it can be changed when logging. */
export function mealNow(d = new Date()): Meal {
  const h = d.getHours()
  if (h < 11) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 19) return 'snack'
  return 'dinner'
}

/** Local calendar day as YYYY-MM-DD, so the day turns over at midnight on the device. */
export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function shiftDay(day: string, by: number): string {
  const [y, m, d] = day.split('-').map(Number)
  return dayKey(new Date(y, m - 1, d + by))
}

export function dayLabel(day: string, today = dayKey()): string {
  if (day === today) return 'Today'
  if (day === shiftDay(today, -1)) return 'Yesterday'
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Today's key, kept current: it changes at midnight, and when the app comes back after a night in the background. */
export function useToday(): string {
  const [today, setToday] = useState(dayKey)
  useEffect(() => {
    let timer: number
    const check = () => setToday(dayKey())
    const arm = () => {
      const now = new Date()
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      timer = window.setTimeout(() => {
        check()
        arm()
      }, next.getTime() - now.getTime() + 50)
    }
    arm()
    const onVisible = () => document.visibilityState === 'visible' && check()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', check)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', check)
    }
  }, [])
  return today
}

/** Label values for `per` scaled to `amount`. Missing values stay missing. */
export function scale(base: Nutrients, per: number, amount: number): Nutrients {
  const k = per > 0 ? amount / per : 0
  const out = { kcal: base.kcal * k } as Nutrients
  for (const { key } of NUTRIENTS) if (key !== 'kcal' && base[key] !== undefined) out[key] = base[key]! * k
  return out
}

export const logNutrients = (l: FoodLog) => scale(l.base, l.per, l.amount)
export const foodNutrients = (f: Food, amount: number) => scale(f.n, f.per, amount)

export function total(logs: FoodLog[]): Required<Nutrients> {
  const t = {} as Required<Nutrients>
  for (const { key } of NUTRIENTS) t[key] = 0
  for (const l of logs) {
    const n = logNutrients(l)
    for (const { key } of NUTRIENTS) t[key] += n[key] ?? 0
  }
  return t
}

export const kcal = (n: number) => Math.round(n).toLocaleString()
/** Grams to one decimal under 10, whole numbers above. */
export const grams = (n: number) => (n < 10 ? String(Math.round(n * 10) / 10) : String(Math.round(n)))

/** "15 g", "200 ml", "1 piece", "1.5 pieces", "1 serving". */
export function fmtAmount(amount: number, unit: FoodUnit): string {
  const n = grams(amount)
  if (unit === 'pc') return `${n} ${amount === 1 ? 'piece' : 'pieces'}`
  if (unit === 'srv') return `${n} ${amount === 1 ? 'serving' : 'servings'}`
  return `${n} ${unit}`
}

// Recipes ---------------------------------------------------------------------------------------------

export const TSP_PER_TBSP = 3
/** A level teaspoon of a liquid is 5 ml. Powders differ (instant coffee about 2 g, sugar about 4 g), so they need their own. */
export const TSP_ML = 5

/** Grams (or ml) in one teaspoon of this food, if known. */
export const spoonSize = (f: Pick<Food, 'tsp' | 'unit'>): number | undefined => f.tsp ?? (f.unit === 'ml' ? TSP_ML : undefined)

/** The ways an ingredient can be measured: its own unit, its portion (1 roti, 1 egg), and spoons for anything weighed or poured. */
export const measuresFor = (f: Pick<Food, 'unit' | 'serving'>): IngredientMeasure[] => {
  const own: IngredientMeasure[] = f.unit === 'g' || f.unit === 'ml' ? ['tsp', 'tbsp', f.unit] : [f.unit as IngredientMeasure]
  return hasPortion(f) ? ['portion', ...own] : own
}

/** A portion worth offering: not for pieces, and not a "1 tsp" serving, which the spoons already cover. */
export const hasPortion = (f: Pick<Food, 'unit' | 'serving'>) => !!f.serving && f.unit !== 'pc' && !/^\S+\s+(tsp|tbsp|teaspoons?|tablespoons?)$/i.test(f.serving.label.trim())

/** "egg" for a "1 egg" portion, plural "eggs" for 2; a portion like "10 almonds" reads "10 almonds" or "2 × 10 almonds". */
export function portionName(f: Pick<Food, 'serving'>, qty = 1): string {
  const label = f.serving?.label.trim() ?? 'portion'
  const one = label.match(/^(?:1|one|a)\s+(.+)$/i)
  if (!one) return qty === 1 ? label : `× ${label}`
  const noun = one[1]
  return qty === 1 || /s$/i.test(noun) ? noun : noun + 's'
}

/** An ingredient line in the food's own unit (grams, ml or pieces). Undefined when a spoon size (or portion size) is needed and not set. */
export function itemAmount(item: Pick<RecipeItem, 'qty' | 'measure'>, f: Pick<Food, 'tsp' | 'unit' | 'serving'>): number | undefined {
  if (item.measure === 'portion') return f.serving ? item.qty * f.serving.amount : undefined
  if (item.measure !== 'tsp' && item.measure !== 'tbsp') return item.qty
  const s = spoonSize(f)
  return s === undefined ? undefined : item.qty * s * (item.measure === 'tbsp' ? TSP_PER_TBSP : 1)
}

/** Sum of nutrients. A marker no part reports stays missing rather than showing a made-up 0. */
export function addNutrients(parts: Nutrients[]): Nutrients {
  const out = { kcal: 0 } as Nutrients
  for (const n of parts)
    for (const { key } of NUTRIENTS) {
      const v = n[key]
      if (v !== undefined) out[key] = (out[key] ?? 0) + v
    }
  return out
}

/**
 * Nutrition of a mix of ingredients, divided by the servings it makes.
 * `missing` names ingredients that can't be counted: deleted foods, or spoons with no spoon size yet.
 */
export function mixNutrients(items: RecipeItem[], lookup: (id: string) => Food | undefined, servings = 1): { n: Nutrients; missing: string[] } {
  const parts: Nutrients[] = []
  const missing: string[] = []
  for (const it of items) {
    const f = lookup(it.foodId)
    const amount = f && itemAmount(it, f)
    if (!f || amount === undefined) missing.push(it.name)
    else parts.push(foodNutrients(f, amount))
  }
  const sum = addNutrients(parts)
  return { n: servings > 0 && servings !== 1 ? scale(sum, servings, 1) : sum, missing }
}

/** "1 tbsp", "2 tsp", "100 ml", "1 piece". A portion has no unit of its own, so mixText writes it as "2 × Egg". */
export const fmtMeasure = (qty: number, m: IngredientMeasure) => (m === 'tsp' || m === 'tbsp' ? `${grams(qty)} ${m}` : m === 'portion' ? `${grams(qty)} ×` : fmtAmount(qty, m))

/** "3 tbsp Instant coffee + 100 ml Water", "1 × Wheat roti + 2 × Egg, raw + 50 g Paneer". */
export const mixText = (items: Pick<RecipeItem, 'name' | 'qty' | 'measure'>[]) => items.map((i) => `${fmtMeasure(i.qty, i.measure)} ${i.name}`).join(' + ')

// Typing a dish ---------------------------------------------------------------------------------------

const UNIT_WORDS: Record<string, IngredientMeasure> = {
  g: 'g', gm: 'g', gms: 'g', gram: 'g', grams: 'g', gr: 'g',
  ml: 'ml', millilitre: 'ml', milliliter: 'ml', millilitres: 'ml', milliliters: 'ml',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  pc: 'pc', pcs: 'pc', piece: 'pc', pieces: 'pc',
}
const NUMBER_WORDS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, half: 0.5 }
const FILLER = new Set(['of', 'the', 'and', 'some', 'cooked', 'fresh'])

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
/** eggs → egg, tomatoes → tomato, leaves → leave: enough to match a food name. */
const stem = (w: string) => (w.length > 3 && w.endsWith('es') && !w.endsWith('ses') ? w.slice(0, -2) : w.length > 2 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)

export interface TypedLine {
  text: string
  qty: number
  /** The measure typed, if any ("50g", "2 tbsp"); otherwise a count (2 eggs) or the food's portion. */
  measure?: IngredientMeasure
  name: string
}

/** "1 wheat roti, 2 eggs, 50gm paneer" → three lines. Also splits on "+", "and", "with" and new lines. */
export function parseTyped(text: string): TypedLine[] {
  return text
    .split(/\n|,|;|\+|\band\b|\bwith\b/i)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => {
      let rest = t.replace(/^(\d+(?:[.,]\d+)?|\d+\/\d+)\s*([a-z]+)?\b/i, (_, num: string, unit?: string) => `${num} ${unit ?? ''}`)
      const ws = rest.split(/\s+/)
      let qty = 1
      let measure: IngredientMeasure | undefined
      const n0 = ws[0]?.toLowerCase()
      if (n0 && /^\d/.test(n0)) {
        qty = n0.includes('/') ? Number(n0.split('/')[0]) / Number(n0.split('/')[1]) : parseFloat(n0.replace(',', '.'))
        ws.shift()
      } else if (n0 && NUMBER_WORDS[n0] !== undefined) {
        qty = NUMBER_WORDS[n0]
        ws.shift()
      }
      const u = ws[0]?.toLowerCase()
      if (u && UNIT_WORDS[u]) {
        measure = UNIT_WORDS[u]
        ws.shift()
      }
      rest = ws.filter((w) => !FILLER.has(w.toLowerCase())).join(' ')
      return { text: t, qty: Number.isFinite(qty) && qty > 0 ? qty : 1, measure, name: rest.trim() }
    })
    .filter((l) => l.name)
}

/**
 * The food a typed name most likely means: every typed word should start a word of the food's name
 * ("wheat roti" → "Wheat roti (chapati)", "eggs" → "Egg, raw"). The default (starter) food wins a tie, so a
 * brand is used only when you type it ("50g amul paneer") or pick it on the line; then the shorter, plainer
 * name ("Paneer" over "Paneer tikka").
 */
export function matchFood(name: string, foods: Food[]): Food | undefined {
  const want = words(name).map(stem)
  if (!want.length) return undefined
  let best: { f: Food; score: number } | undefined
  for (const f of foods) {
    if (f.recipe) continue
    const have = words(foodTitle(f)).map(stem)
    const hits = want.filter((w) => have.some((h) => h.startsWith(w) || (w.startsWith(h) && h.length >= 3))).length
    if (hits < want.length) continue
    const score = hits * 1000 - (have.length - hits) * 10 + (f.sample ? 5 : 0)
    if (!best || score > best.score || (score === best.score && foodTitle(f).length < foodTitle(best.f).length)) best = { f, score }
  }
  return best?.f
}

const hasWords = (want: string[], f: Food) => {
  const have = words(foodTitle(f)).map(stem)
  return want.every((w) => have.some((h) => h.startsWith(w) || (w.startsWith(h) && h.length >= 3)))
}
/** "Egg, raw" → egg; "Wheat roti (chapati)" → wheat roti: the kind of food, before any comma or bracket. */
const kindWords = (f: Food) => words(f.name.split(/[,(]/)[0]).map(stem)

/**
 * Brands you could use for an ingredient line: the default food first, then your own foods of the same kind
 * (your Amul paneer for Paneer, your farm eggs for Egg). Empty when there's nothing to choose between.
 */
export function brandChoices(item: Pick<RecipeItem, 'foodId' | 'defaultId'>, foods: Food[]): Food[] {
  const byId = (id?: string) => (id ? foods.find((f) => f.id === id) : undefined)
  const current = byId(item.foodId)
  const def = byId(item.defaultId) ?? (current?.sample ? current : undefined)
  const base = def ?? current
  if (!base) return []
  const kind = kindWords(base)
  const own = foods.filter((f) => !f.recipe && !f.sample && f.id !== def?.id && hasWords(kind, f))
  const list = [...(def ? [def] : []), ...own]
  if (current && !list.includes(current)) list.unshift(current)
  return list.length > 1 ? list : []
}

/** Switch a line to another food of the same kind, keeping the amount: 2 eggs stay 2 eggs, 50 g stays 50 g. */
export function swapFood(item: RecipeItem, from: Food | undefined, to: Food, defaultId?: string): RecipeItem {
  const next = { ...item, foodId: to.id, name: foodTitle(to), defaultId: to.id === defaultId ? undefined : defaultId }
  const ms = measuresFor(to)
  if (ms.includes(item.measure)) return next
  const count = item.measure === 'portion' || item.measure === 'pc'
  if (count && ms.includes('portion')) return { ...next, measure: 'portion' }
  if (count && to.unit === 'pc') return { ...next, measure: 'pc' }
  const amount = from && itemAmount(item, from)
  if (amount !== undefined && (to.unit === 'g' || to.unit === 'ml')) return { ...next, measure: to.unit, qty: +amount.toFixed(1) }
  return { ...next, measure: ms[0], qty: 1 }
}

/** Turn a typed line into a recipe line for a food: "50g" stays grams; "2 eggs" counts portions or pieces. */
export function typedItem(line: TypedLine, f: Food): RecipeItem {
  const measures = measuresFor(f)
  let measure: IngredientMeasure
  if (line.measure && measures.includes(line.measure)) measure = line.measure
  else if (line.measure === 'pc' && measures.includes('portion')) measure = 'portion'
  else if (!line.measure && measures.includes('portion')) measure = 'portion'
  else if (!line.measure && f.unit === 'pc') measure = 'pc'
  else measure = line.measure === 'g' || line.measure === 'ml' ? (f.unit === 'pc' ? 'pc' : (f.unit as IngredientMeasure)) : measures[measures.length - 1]
  // No unit and no portion: "1 paneer" means nothing in grams, so start from 100 g and let you change it.
  const qty = !line.measure && (measure === 'g' || measure === 'ml') ? 100 : line.qty
  return { foodId: f.id, name: foodTitle(f), qty, measure }
}

export const foodTitle = (f: { name: string; brand?: string }) => (f.brand ? `${f.name} · ${f.brand}` : f.name)
