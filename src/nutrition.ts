// Daily calorie tracking helpers: local days, scaling label values to what you ate, and totals.
import { useEffect, useState } from 'react'
import type { Food, FoodLog, FoodUnit, Meal, NutrientKey, Nutrients, Settings } from './types'

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

/** "15 g", "200 ml", "1 piece", "1.5 pieces". */
export function fmtAmount(amount: number, unit: FoodUnit): string {
  const n = grams(amount)
  if (unit !== 'pc') return `${n} ${unit}`
  return `${n} ${amount === 1 ? 'piece' : 'pieces'}`
}

export const foodTitle = (f: { name: string; brand?: string }) => (f.brand ? `${f.name} · ${f.brand}` : f.name)
