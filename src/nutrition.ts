// Daily calorie tracking helpers: local days, scaling label values to what you ate, and totals.
import { useEffect, useState } from 'react'
import type { Food, FoodLog, FoodUnit, Meal, IngredientMeasure, Nutrients, RecipeItem } from './types'

export const NUTRIENTS: { key: keyof Nutrients; label: string; unit: string }[] = [
  { key: 'kcal', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'sugar', label: 'of which sugar', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'satFat', label: 'of which saturated', unit: 'g' },
  { key: 'fibre', label: 'Fibre', unit: 'g' },
  { key: 'sodium', label: 'Sodium', unit: 'mg' },
]

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
  const t: Required<Nutrients> = { kcal: 0, protein: 0, carbs: 0, sugar: 0, fat: 0, satFat: 0, fibre: 0, sodium: 0 }
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

/** The ways an ingredient can be measured: its own unit, plus spoons for anything weighed or poured. */
export const measuresFor = (f: Pick<Food, 'unit'>): IngredientMeasure[] => (f.unit === 'g' || f.unit === 'ml' ? ['tsp', 'tbsp', f.unit] : [f.unit as IngredientMeasure])

/** An ingredient line in the food's own unit (grams, ml or pieces). Undefined when a spoon size is needed and not set. */
export function itemAmount(item: Pick<RecipeItem, 'qty' | 'measure'>, f: Pick<Food, 'tsp' | 'unit'>): number | undefined {
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

/** "1 tbsp", "2 tsp", "100 ml", "1 piece". */
export const fmtMeasure = (qty: number, m: IngredientMeasure) => (m === 'tsp' || m === 'tbsp' ? `${grams(qty)} ${m}` : fmtAmount(qty, m))

/** "3 tbsp Instant coffee + 100 ml Water". */
export const mixText = (items: Pick<RecipeItem, 'name' | 'qty' | 'measure'>[]) => items.map((i) => `${fmtMeasure(i.qty, i.measure)} ${i.name}`).join(' + ')

export const foodTitle = (f: { name: string; brand?: string }) => (f.brand ? `${f.name} · ${f.brand}` : f.name)
