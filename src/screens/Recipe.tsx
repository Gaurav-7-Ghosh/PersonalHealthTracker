// Recipes and home-cooked dishes: a food made of other foods, measured by the spoon, by weight or by the piece
// (1 tbsp instant coffee + 100 ml water; 1 roti + 2 eggs + 50 g paneer for an egg paneer roll).
// A recipe is stored as a Food with `recipe` set, so it shows in the food picker, Recent and sync like any food.
import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { Chip, Confirm, Sheet, Stepper, TopBar } from '../components/ui'
import { useStore } from '../store'
import { MEALS, NUTRIENTS, dayLabel, fmtAmount, fmtNutrient, foodNutrients, foodTitle, grams, itemAmount, kcal, mealLabel, brandChoices, hasPortion, matchFood, swapFood, measuresFor, mixNutrients, mixText, parseTyped, portionName, scale, typedItem } from '../nutrition'
import type { Food, FoodLog, Meal, IngredientMeasure, Nutrients, RecipeItem } from '../types'
import { uid } from '../util'
import { FoodThumb } from './Health'

const STEP: Record<IngredientMeasure, number> = { tsp: 0.5, tbsp: 0.5, g: 5, ml: 10, pc: 0.5, portion: 0.5 }

/** Spoon sizes typed while building a mix, layered over the saved foods until they are saved. */
function useMixFoods() {
  const { food, saveFood } = useStore()
  const [spoons, setSpoons] = useState<Record<string, number>>({})
  const lookup = (id: string): Food | undefined => {
    const f = food(id)
    return f && spoons[id] ? { ...f, tsp: spoons[id] } : f
  }
  const setSpoon = (id: string, v: number | undefined) =>
    setSpoons((s) => {
      const next = { ...s }
      if (v && v > 0) next[id] = v
      else delete next[id]
      return next
    })
  /** Remember typed spoon sizes on the foods themselves, so the next recipe already knows them. */
  const saveSpoons = async () => {
    for (const [id, tsp] of Object.entries(spoons)) {
      const f = food(id)
      if (f && f.tsp !== tsp) await saveFood({ ...f, tsp, updatedAt: Date.now() })
    }
  }
  return { lookup, setSpoon, saveSpoons }
}

/** The ingredient lines: amount, measure (tsp, tbsp, g, ml) and, for powders, how much a teaspoon weighs. */
function MixRows({ items, onChange, lookup, setSpoon, onRemove }: { items: RecipeItem[]; onChange: (i: number, p: Partial<RecipeItem>) => void; lookup: (id: string) => Food | undefined; setSpoon: (id: string, v: number | undefined) => void; onRemove?: (i: number) => void }) {
  const { foods } = useStore()
  return (
    <ul className="mix-list">
      {items.map((it, i) => {
        const f = lookup(it.foodId)
        const amount = f && itemAmount(it, f)
        const spoon = it.measure === 'tsp' || it.measure === 'tbsp'
        const portion = it.measure === 'portion'
        return (
          <li key={it.foodId + i} className="mix-row card" aria-label={it.name}>
            <div className="mix-head">
              <span className="list-name">{it.name}</span>
              {onRemove && (
                <button type="button" className="icon-btn" aria-label={`Remove ${it.name}`} onClick={() => onRemove(i)}>
                  <Icon name="trash" size={18} />
                </button>
              )}
            </div>
            {f && <BrandPick item={it} food={f} foods={foods} onPick={(to, defaultId) => onChange(i, swapFood(it, f, to, defaultId))} />}
            {!f ? (
              <p className="warn small">This food was deleted, so it isn't counted. Remove it or add the food again.</p>
            ) : (
              <>
                <div className="mix-amount">
                  <Stepper label={it.name} unit={portion && f ? portionName(f, it.qty) : it.measure} step={STEP[it.measure]} min={0} value={it.qty} onChange={(qty) => onChange(i, { qty })} />
                  {measuresFor(f).length > 1 && (
                    <div className="segmented" role="tablist" aria-label={`IngredientMeasure for ${it.name}`}>
                      {measuresFor(f).map((m) => (
                        <button key={m} type="button" role="tab" aria-selected={it.measure === m} onClick={() => onChange(i, { measure: m, qty: m === it.measure ? it.qty : m === 'g' || m === 'ml' ? (amount ? +amount.toFixed(1) : 100) : 1 })}>
                          {m === 'portion' ? portionName(f) : m}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {spoon && f.unit === 'g' && <SpoonField food={f} onChange={(v) => setSpoon(f.id, v)} />}
                <p className="muted small">
                  {amount === undefined ? 'Set how much a teaspoon weighs to count this.' : `${spoon || portion ? fmtAmount(amount, f.unit) + ' · ' : ''}${kcal(foodNutrients(f, amount).kcal)} kcal`}
                </p>
              </>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** Optional: which brand went in (your Amul paneer, your farm eggs). Left alone, the default food counts. */
function BrandPick({ item, food, foods, onPick }: { item: RecipeItem; food: Food; foods: Food[]; onPick: (to: Food, defaultId: string | undefined) => void }) {
  const choices = brandChoices(item, foods)
  if (!choices.length) return null
  const defaultId = item.defaultId ?? (food.sample ? food.id : undefined)
  const id = 'brand-' + item.foodId + '-' + item.name.replace(/\W+/g, '-')
  return (
    <div className="per-row brand-row">
      <label htmlFor={id}>Brand</label>
      <select id={id} value={food.id} onChange={(e) => onPick(choices.find((c) => c.id === e.target.value)!, defaultId)}>
        {choices.map((c) => (
          <option key={c.id} value={c.id}>
            {c.id === defaultId ? 'Default' : c.brand || c.name} · {kcal(c.n.kcal)} kcal / {fmtAmount(c.per, c.unit)}
          </option>
        ))}
      </select>
    </div>
  )
}

function SpoonField({ food, onChange }: { food: Food; onChange: (v: number | undefined) => void }) {
  const [t, setT] = useState(() => (food.tsp ? String(food.tsp) : ''))
  const id = 'tsp-' + food.id
  return (
    <div className="per-row spoon-row">
      <label htmlFor={id}>1 tsp weighs</label>
      <input
        id={id}
        inputMode="decimal"
        value={t}
        placeholder={food.tsp ? undefined : 'e.g. 1.8'}
        onChange={(e) => {
          const v = e.target.value
          if (!/^\d*([.,]\d*)?$/.test(v)) return
          setT(v)
          const n = parseFloat(v.replace(',', '.'))
          onChange(Number.isFinite(n) && n > 0 ? n : undefined)
        }}
      />
      <span className="muted">g · 1 tbsp = 3 tsp</span>
    </div>
  )
}

/** Every marker the mix reports, so new ones (sodium, sugar, ...) show up as soon as they're in NUTRIENTS. */
function NutrientTable({ n, label }: { n: Nutrients; label: string }) {
  return (
    <div className="card mix-total" aria-label={label}>
      <div className="amount-preview">
        <span className="stat-val big" data-testid="recipe-kcal">
          {kcal(n.kcal)}
        </span>
        <span className="muted"> kcal</span>
        <div className="muted small">{label}</div>
      </div>
      <dl className="nutri-list">
        {NUTRIENTS.filter((x) => x.key !== 'kcal' && n[x.key] !== undefined).map((x) => (
          <div key={x.key} className={x.sub ? 'sub' : undefined}>
            <dt>{x.label}</dt>
            <dd>{fmtNutrient(n[x.key]!, x.unit)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** Pick an ingredient from your foods (not other recipes). */
function IngredientPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (f: Food) => void }) {
  const { foods } = useStore()
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const list = foods
    .filter((f) => !f.recipe && (!needle || f.name.toLowerCase().includes(needle) || f.brand?.toLowerCase().includes(needle)))
    .sort((a, b) => Number(!!a.sample) - Number(!!b.sample) || a.name.localeCompare(b.name))
  return (
    <Sheet open={open} onClose={onClose} title="Add ingredient">
      <div className="search">
        <Icon name="search" />
        <input placeholder="Search food or brand" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search ingredients" />
      </div>
      <ul className="list compact picker-list">
        {list.map((f) => (
          <li key={f.id}>
            <button type="button" className="list-row" onClick={() => onPick(f)}>
              <FoodThumb food={f} />
              <span className="list-main">
                <span className="list-name">{f.name}</span>
                <span className="list-sub">
                  {f.brand ? `${f.brand} · ` : ''}
                  {kcal(f.n.kcal)} kcal per {fmtAmount(f.per, f.unit)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {!list.length && <p className="muted small">No food matches. Add it under My foods first, with the values from the label.</p>}
    </Sheet>
  )
}

/** A sensible first line for a new ingredient: 1 portion (1 roti, 1 egg) for a weighed food that has one, else spoons for powders, 100 ml for liquids, 1 for pieces. */
function firstItem(f: Food): RecipeItem {
  if (f.unit === 'g' && hasPortion(f)) return { foodId: f.id, name: foodTitle(f), qty: 1, measure: 'portion' }
  const measure: IngredientMeasure = f.unit === 'g' ? 'tsp' : f.unit === 'ml' ? 'ml' : 'pc'
  return { foodId: f.id, name: foodTitle(f), qty: measure === 'ml' ? 100 : 1, measure }
}

/**
 * Type the dish the way you'd say it ("1 wheat roti, 2 eggs, 50g paneer") and each part is matched to a food.
 * Parts that match nothing are listed, so you can add them from the picker or under My foods.
 */
function TypedIngredients({ onAdd }: { onAdd: (items: RecipeItem[]) => void }) {
  const { foods } = useStore()
  const [text, setText] = useState('')
  const [unmatched, setUnmatched] = useState<string[]>([])
  const add = () => {
    const found: RecipeItem[] = []
    const miss: string[] = []
    for (const line of parseTyped(text)) {
      // "1 glass milk": the first word may be the portion, so try without it too.
      const short = line.name.split(/\s+/).slice(1).join(' ')
      const f = matchFood(line.name, foods) ?? (short ? matchFood(short, foods) : undefined)
      if (f) found.push(typedItem(line, f))
      else miss.push(line.text)
    }
    if (found.length) onAdd(found)
    setUnmatched(miss)
    setText(miss.join(', '))
  }
  return (
    <div className="typed-ingredients">
      <label htmlFor="typed-ingredients" className="muted small">
        Type what went in
      </label>
      <div className="typed-row">
        <input id="typed-ingredients" value={text} placeholder="1 wheat roti, 2 eggs, 50g paneer" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && text.trim() && add()} />
        <button type="button" className="btn small" disabled={!text.trim()} onClick={add}>
          Add
        </button>
      </div>
      {unmatched.length > 0 && <p className="warn small">No food found for {unmatched.join(', ')}. Add it under My foods with its label values, or pick something close with Add ingredient.</p>}
    </div>
  )
}

/** Create or edit a recipe or home-cooked dish: a name, the ingredients and how many servings they make. */
export function RecipeEdit({ id, day, meal }: { id?: string; day?: string; meal?: Meal }) {
  const { food, saveFood, deleteFood, back, replace, notify } = useStore()
  const original = id ? food(id) : undefined
  const [name, setName] = useState(original?.name ?? '')
  const [items, setItems] = useState<RecipeItem[]>(original?.recipe?.items ?? [])
  const [servings, setServings] = useState(original?.recipe?.servings ?? 1)
  const [picking, setPicking] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { lookup, setSpoon, saveSpoons } = useMixFoods()
  const { n, missing } = mixNutrients(items, lookup, servings)

  const save = async () => {
    if (!name.trim()) return notify('Give the recipe a name first')
    if (!items.length) return notify('Add at least one ingredient')
    if (missing.length) return notify(`Can't count ${missing.join(', ')} yet`)
    if (!(servings > 0)) return notify('It should make at least one serving')
    await saveSpoons()
    const next: Food = {
      id: original?.id ?? uid(),
      name: name.trim(),
      photo: original?.photo,
      unit: 'srv',
      per: 1,
      n,
      recipe: { items, servings },
      sample: original?.sample,
      source: original?.source,
      createdAt: original?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    }
    await saveFood(next)
    notify(`${next.name} saved`)
    if (day) replace({ name: 'foods', day, meal, pick: next.id })
    else back()
  }

  return (
    <div className="screen form">
      <TopBar
        title={original ? 'Edit dish' : 'New dish or recipe'}
        onBack={back}
        right={
          <button type="button" className="btn small primary" onClick={save}>
            Save
          </button>
        }
      />
      <div className="field">
        <label htmlFor="recipe-name">Name</label>
        <input id="recipe-name" value={name} placeholder="e.g. Egg paneer roll" onChange={(e) => setName(e.target.value)} autoFocus={!original} />
      </div>

      <section className="block" aria-label="Ingredients">
        <div className="section-head">
          <h2>Ingredients</h2>
        </div>
        <p className="muted small">What you cooked it with: 1 roti, 2 eggs, 50 g paneer. Pick from your foods and the starter list, then say how much went in by the piece, spoon, gram or ml. A pack with a label goes under My foods first.</p>
        <TypedIngredients onAdd={(xs) => setItems((cur) => [...cur, ...xs])} />
        <MixRows items={items} lookup={lookup} setSpoon={setSpoon} onChange={(i, p) => setItems((xs) => xs.map((x, k) => (k === i ? { ...x, ...p } : x)))} onRemove={(i) => setItems((xs) => xs.filter((_, k) => k !== i))} />
        <button type="button" className="btn ghost" onClick={() => setPicking(true)}>
          <Icon name="plus" size={18} /> Add ingredient
        </button>
      </section>

      <section className="block">
        <Stepper label="Makes" unit={servings === 1 ? 'serving' : 'servings'} step={1} min={1} value={servings} onChange={setServings} />
        <p className="muted small">1 for a roll or a cup of coffee; more for a pot of dal you share out or eat over days.</p>
      </section>

      {items.length > 0 && <NutrientTable n={n} label={servings === 1 ? 'for the whole recipe' : 'per serving'} />}
      {missing.length > 0 && <p className="warn small">Not counted yet: {missing.join(', ')}.</p>}

      {original && (
        <button type="button" className="btn danger-ghost" onClick={() => setConfirmDelete(true)}>
          Delete {original.name}
        </button>
      )}
      <IngredientPicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(f) => {
          setItems((xs) => [...xs, firstItem(f)])
          setPicking(false)
        }}
      />
      <Confirm
        open={confirmDelete}
        title={`Delete ${original?.name ?? 'recipe'}?`}
        body="Days you already logged keep their numbers. The ingredients stay in My foods."
        action="Delete"
        danger
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await deleteFood(original!.id)
          notify('Deleted')
          if (day) replace({ name: 'foods', day, meal })
          else back()
        }}
      />
    </div>
  )
}

const sameMix = (a: RecipeItem[], b: RecipeItem[]) => a.length === b.length && a.every((x, i) => x.foodId === b[i].foodId && x.qty === b[i].qty && x.measure === b[i].measure)

/** Log a recipe: tweak this time's mix (3 tbsp instead of 1), how many servings, and the meal. */
export function RecipeAmountSheet({ food, day, meal, onClose, onDone }: { food: Food; day: string; meal: Meal; onClose: () => void; onDone?: () => void }) {
  const { foodLog, saveLog, saveFood, notify, go } = useStore()
  const recipe = food.recipe!
  const last: FoodLog | undefined = useMemo(() => [...foodLog].reverse().find((l) => l.foodId === food.id && l.mix), [foodLog, food.id])
  // Start from last time's mix when it still uses the same ingredients, else the recipe.
  const [items, setItems] = useState<RecipeItem[]>(() => (last?.mix && last.mix.every((x) => recipe.items.some((r) => r.foodId === x.foodId)) ? last.mix : recipe.items))
  const [amount, setAmount] = useState(last?.amount ?? 1)
  const [m, setM] = useState<Meal>(meal)
  const { lookup, setSpoon, saveSpoons } = useMixFoods()
  const { n, missing } = mixNutrients(items, lookup, recipe.servings)
  const eaten = scale(n, 1, amount)
  const changed = !sameMix(items, recipe.items)

  const add = async () => {
    if (!(amount > 0) || missing.length) return
    await saveSpoons()
    await saveLog({ id: uid(), day, meal: m, foodId: food.id, name: food.name, unit: 'srv', amount, per: 1, base: n, mix: items, at: Date.now(), updatedAt: Date.now() })
    notify(`Added ${kcal(eaten.kcal)} kcal to ${mealLabel(m)}`)
    onClose()
    onDone?.()
  }

  return (
    <Sheet open onClose={onClose} title={food.name}>
      <NutrientTable n={eaten} label={`${fmtAmount(amount, 'srv')} · ${mixText(items)}`} />
      <MixRows items={items} lookup={lookup} setSpoon={setSpoon} onChange={(i, p) => setItems((xs) => xs.map((x, k) => (k === i ? { ...x, ...p } : x)))} />
      {missing.length > 0 && <p className="warn small">Not counted yet: {missing.join(', ')}.</p>}
      {changed && (
        <button
          type="button"
          className="link-btn small"
          onClick={async () => {
            await saveSpoons()
            await saveFood({ ...food, n, recipe: { ...recipe, items }, updatedAt: Date.now() })
            notify('Saved as the usual mix')
          }}
        >
          Make this the usual mix
        </button>
      )}
      <Stepper label="Servings" unit={amount === 1 ? 'serving' : 'servings'} step={0.5} min={0} value={amount} onChange={setAmount} />
      {last && <p className="muted small">Last time: {mixText(last.mix!)}</p>}
      <div className="chips wrap" aria-label="Meal">
        {MEALS.map((x) => (
          <Chip key={x.id} on={m === x.id} onClick={() => setM(x.id)}>
            {x.label}
          </Chip>
        ))}
      </div>
      <button type="button" className="btn primary" disabled={!(amount > 0) || missing.length > 0} onClick={add}>
        Add to {mealLabel(m)}
      </button>
      <button
        type="button"
        className="link-btn"
        onClick={() => {
          onClose()
          go({ name: 'recipeEdit', id: food.id, day, meal: m })
        }}
      >
        Edit recipe
      </button>
      <p className="muted small center">{dayLabel(day)}</p>
    </Sheet>
  )
}

