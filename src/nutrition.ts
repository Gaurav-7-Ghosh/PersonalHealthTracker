// Daily calorie tracking helpers: local days, scaling label values to what you ate, and totals.
import { useEffect, useState } from 'react'
import type { Food, FoodLog, FoodUnit, Meal, Nutrients } from './types'

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

/** "15 g", "200 ml", "1 piece", "1.5 pieces". */
export function fmtAmount(amount: number, unit: FoodUnit): string {
  const n = grams(amount)
  if (unit !== 'pc') return `${n} ${unit}`
  return `${n} ${amount === 1 ? 'piece' : 'pieces'}`
}

export const foodTitle = (f: { name: string; brand?: string }) => (f.brand ? `${f.name} · ${f.brand}` : f.name)
