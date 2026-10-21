// Starter foods so the Health screen isn't empty. Marked as sample; edit or remove any of them.
//
// Sources:
// - USDA FoodData Central, SR Legacy (public domain, CC0): https://fdc.nal.usda.gov/
//   Values are per 100 g (or 100 ml for drinks) and the `source` names the exact FDC description.
// - Dishes (dal, chicken tikka, paneer tikka, milk coffee) have no open lab values that match a home
//   recipe, so they are worked out from those USDA ingredients with the recipe written in `source`.
//   Treat them as estimates and edit them to match how you cook or order them.
import type { Food, FoodUnit, Nutrients } from './types'

const SR = 'USDA FoodData Central, SR Legacy: '

function f(id: string, name: string, n: Nutrients, source: string, opts: { unit?: FoodUnit; per?: number; serving?: [string, number] } = {}): Food {
  return {
    id: 'food-' + id,
    name,
    unit: opts.unit ?? 'g',
    per: opts.per ?? 100,
    n,
    serving: opts.serving ? { label: opts.serving[0], amount: opts.serving[1] } : undefined,
    source,
    sample: true,
    createdAt: 0,
    updatedAt: 0,
  }
}

export const SEED_FOODS: Food[] = [
  // Drinks
  f('coffee-black', 'Coffee, black', { kcal: 1, protein: 0.1, carbs: 0, fat: 0, sodium: 2 }, SR + 'Beverages, coffee, brewed, prepared with tap water', { unit: 'ml', serving: ['1 cup', 200] }),
  // 150 ml brewed coffee + 50 ml whole milk + 1 tsp (4 g) sugar = 48 kcal per 200 ml cup.
  f('coffee-milk', 'Coffee with milk and sugar', { kcal: 24, protein: 0.8, carbs: 3.2, sugar: 3.2, fat: 0.8, sodium: 12 }, 'Estimate from USDA: 150 ml brewed coffee, 50 ml whole milk, 4 g sugar per 200 ml cup', { unit: 'ml', serving: ['1 cup', 200] }),
  f('milk-whole', 'Milk, whole', { kcal: 61, protein: 3.2, carbs: 4.8, sugar: 5.1, fat: 3.3, satFat: 1.9, sodium: 43 }, SR + 'Milk, whole, 3.25% milkfat, with added vitamin D', { unit: 'ml', serving: ['1 glass', 250] }),
  f('sugar', 'Sugar', { kcal: 387, carbs: 100, sugar: 100 }, SR + 'Sugars, granulated', { serving: ['1 tsp', 4] }),

  // Breads, rice, dal
  f('roti', 'Wheat roti (chapati)', { kcal: 299, protein: 7.9, carbs: 46.1, sugar: 2.9, fat: 9.2, fibre: 9.7, sodium: 298 }, SR + 'Bread, chapati or roti, whole wheat, commercially prepared, frozen (FDC 174075)', { serving: ['1 roti', 40] }),
  f('rice-white', 'White rice, cooked', { kcal: 130, protein: 2.7, carbs: 28.2, fat: 0.3, fibre: 0.4, sodium: 1 }, SR + 'Rice, white, long-grain, regular, enriched, cooked', { serving: ['1 cup', 160] }),
  f('lentils', 'Lentils (dal), boiled, plain', { kcal: 116, protein: 9, carbs: 20.1, sugar: 1.8, fat: 0.4, fibre: 7.9, sodium: 2 }, SR + 'Lentils, mature seeds, cooked, boiled, without salt', { serving: ['1 katori', 150] }),
  // 97 g boiled lentils + 3 g ghee, salt and spices.
  f('dal-tadka', 'Dal tadka', { kcal: 139, protein: 8.7, carbs: 19.5, sugar: 1.7, fat: 3.4, satFat: 1.9, fibre: 7.7, sodium: 250 }, 'Estimate from USDA: 97 g boiled lentils + 3 g ghee (butter oil) per 100 g, with salt', { serving: ['1 katori', 150] }),
  f('rajma', 'Rajma (kidney beans), boiled', { kcal: 127, protein: 8.7, carbs: 22.8, sugar: 0.3, fat: 0.5, fibre: 6.4, sodium: 2 }, SR + 'Beans, kidney, all types, mature seeds, cooked, boiled, without salt', { serving: ['1 katori', 150] }),
  f('chana', 'Chickpeas (chana), boiled', { kcal: 164, protein: 8.9, carbs: 27.4, sugar: 4.8, fat: 2.6, fibre: 7.6, sodium: 7 }, SR + 'Chickpeas (garbanzo beans, bengal gram), mature seeds, cooked, boiled, without salt', { serving: ['1 katori', 150] }),
  f('oats', 'Oats, dry', { kcal: 389, protein: 16.9, carbs: 66.3, fat: 6.9, fibre: 10.6, sodium: 2 }, SR + 'Cereals, oats, regular and quick, not fortified, dry', { serving: ['1 bowl', 40] }),

  // Chicken, paneer, eggs, curd
  f('chicken-breast', 'Chicken breast, cooked', { kcal: 165, protein: 31, carbs: 0, fat: 3.6, satFat: 1, sodium: 74 }, SR + 'Chicken, broilers or fryers, breast, meat only, cooked, roasted', { serving: ['1 piece', 120] }),
  // 85 g roasted chicken breast + 10 g whole-milk yogurt + 3 g oil + 2 g spices and lemon.
  f('chicken-tikka', 'Chicken tikka', { kcal: 173, protein: 26.7, carbs: 1.5, fat: 6.4, satFat: 1.3, sodium: 380 }, 'Estimate from USDA: 85 g roasted chicken breast, 10 g whole-milk yogurt, 3 g oil per 100 g, with salt and spices', { serving: ['6 pieces', 150] }),
  // 70 g paneer (about 265 kcal, 18 g protein, 21 g fat per 100 g) + 25 g peppers and onion + 3 g oil + 2 g yogurt.
  f('paneer-tikka', 'Paneer tikka', { kcal: 222, protein: 13, carbs: 3.6, sugar: 1.6, fat: 17.8, satFat: 9.5, fibre: 0.6, sodium: 300 }, 'Estimate: 70 g paneer (as on a typical full-fat pack), 25 g peppers and onion, 3 g oil per 100 g. Swap in your paneer label for accuracy', { serving: ['6 pieces', 150] }),
  f('egg-boiled', 'Egg, boiled', { kcal: 155, protein: 12.6, carbs: 1.1, sugar: 1.1, fat: 10.6, satFat: 3.3, sodium: 124 }, SR + 'Egg, whole, cooked, hard-boiled', { serving: ['1 egg', 50] }),
  f('curd', 'Curd (plain yogurt)', { kcal: 61, protein: 3.5, carbs: 4.7, sugar: 4.7, fat: 3.3, satFat: 2.1, sodium: 46 }, SR + 'Yogurt, plain, whole milk', { serving: ['1 katori', 150] }),
  f('ghee', 'Ghee', { kcal: 876, fat: 99.5, satFat: 61.9 }, SR + 'Butter oil, anhydrous', { serving: ['1 tsp', 5] }),

  // Fruit and nuts
  f('banana', 'Banana', { kcal: 89, protein: 1.1, carbs: 22.8, sugar: 12.2, fat: 0.3, fibre: 2.6, sodium: 1 }, SR + 'Bananas, raw', { serving: ['1 medium', 118] }),
  f('apple', 'Apple', { kcal: 52, protein: 0.3, carbs: 13.8, sugar: 10.4, fat: 0.2, fibre: 2.4, sodium: 1 }, SR + 'Apples, raw, with skin', { serving: ['1 medium', 180] }),
  f('almonds', 'Almonds', { kcal: 579, protein: 21.2, carbs: 21.6, sugar: 4.4, fat: 49.9, satFat: 3.8, fibre: 12.5, sodium: 1 }, SR + 'Nuts, almonds', { serving: ['10 almonds', 12] }),
  f('cashews', 'Cashews', { kcal: 553, protein: 18.2, carbs: 30.2, sugar: 5.9, fat: 43.9, satFat: 7.8, fibre: 3.3, sodium: 12 }, SR + 'Nuts, cashew nuts, raw', { serving: ['10 cashews', 15] }),
]
