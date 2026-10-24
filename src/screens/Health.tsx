import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { Chip, Confirm, Empty, Photo, Sheet, Stepper, TopBar } from '../components/ui'
import { useStore } from '../store'
import { MEALS, NUTRIENTS, dayLabel, fmtAmount, foodNutrients, foodTitle, grams, kcal, logNutrients, mealLabel, mealNow, shiftDay, total, useToday } from '../nutrition'
import type { Food, FoodLog, FoodUnit, Meal, Nutrients } from '../types'
import { deletePhoto, resizeImage, savePhoto, uid } from '../util'

// The day being looked at. Kept outside the screen so adding a food to yesterday and coming back stays on
// yesterday. Undefined means "today", which follows the clock past midnight.
let viewDay: string | undefined

export function Health() {
  const { foodLog, food, settings, saveSettings, go } = useStore()
  const today = useToday()
  const [day, setDayState] = useState(() => (viewDay && viewDay < today ? viewDay : today))
  const [editing, setEditing] = useState<FoodLog | null>(null)
  const [goalOpen, setGoalOpen] = useState(false)
  const setDay = (d: string) => {
    const next = d >= today ? today : d
    viewDay = next === today ? undefined : next
    setDayState(next)
  }
  // Following today: move on to the new day at midnight.
  const following = useRef(day === today)
  useEffect(() => {
    if (following.current) setDayState(today)
  }, [today])
  useEffect(() => {
    following.current = day === today
  }, [day, today])

  const logs = useMemo(() => foodLog.filter((l) => l.day === day), [foodLog, day])
  const t = total(logs)
  const goal = settings.kcalGoal || 2000
  const left = goal - t.kcal

  return (
    <div className="screen">
      <header className="hero">
        <div className="eyebrow">Calories</div>
        <h1>Health</h1>
      </header>

      <div className="day-nav" aria-label="Day">
        <button type="button" className="icon-btn" aria-label="Previous day" onClick={() => setDay(shiftDay(day, -1))}>
          <Icon name="back" size={22} />
        </button>
        <span className="day-name">{dayLabel(day, today)}</span>
        <button type="button" className="icon-btn" aria-label="Next day" disabled={day >= today} onClick={() => setDay(shiftDay(day, 1))}>
          <Icon name="next" size={22} />
        </button>
      </div>

      <section className="card kcal-card" aria-label="Daily total">
        <Ring value={t.kcal} goal={goal} />
        <div className="kcal-side">
          <div>
            <div className="eyebrow">Eaten</div>
            <div className="stat-val big" data-testid="kcal-total">
              {kcal(t.kcal)}
            </div>
            <div className="muted small">kcal</div>
          </div>
          <div>
            <div className="eyebrow">{left >= 0 ? 'Left' : 'Over'}</div>
            <div className={left >= 0 ? 'stat-val' : 'stat-val warn'}>{kcal(Math.abs(left))} kcal</div>
          </div>
          <button type="button" className="link-btn small" onClick={() => setGoalOpen(true)}>
            Goal {kcal(goal)} kcal
          </button>
        </div>
      </section>

      <div className="grid-3">
        {(['protein', 'carbs', 'fat'] as const).map((k) => (
          <div key={k} className="stat">
            <div className="eyebrow">{NUTRIENTS.find((n) => n.key === k)!.label}</div>
            <div className="stat-val">{grams(t[k])} g</div>
          </div>
        ))}
      </div>

      <div className="row-2">
        <button type="button" className="btn primary" onClick={() => go({ name: 'foods', day, meal: day === today ? mealNow() : 'snack' })}>
          <Icon name="plus" size={18} /> Add food
        </button>
        <button type="button" className="btn ghost" onClick={() => go({ name: 'foods' })}>
          <Icon name="bowl" size={18} /> My foods
        </button>
      </div>

      {MEALS.map((m) => {
        const items = logs.filter((l) => l.meal === m.id)
        return (
          <section key={m.id} className="block" aria-label={m.label}>
            <div className="section-head">
              <h2>{m.label}</h2>
              <span className="row-tight meal-head">
                {items.length > 0 && <span className="muted">{kcal(total(items).kcal)} kcal</span>}
                <button type="button" className="link-btn" aria-label={`Add to ${m.label}`} onClick={() => go({ name: 'foods', day, meal: m.id })}>
                  Add
                </button>
              </span>
            </div>
            {items.length > 0 && (
              <ul className="list compact">
                {items.map((l) => {
                  const n = logNutrients(l)
                  return (
                    <li key={l.id}>
                      <button type="button" className="list-row" onClick={() => setEditing(l)}>
                        <FoodThumb food={food(l.foodId) ?? l} />
                        <span className="list-main">
                          <span className="list-name">{l.name}</span>
                          <span className="list-sub">
                            {l.brand ? `${l.brand} · ` : ''}
                            {fmtAmount(l.amount, l.unit)}
                          </span>
                        </span>
                        <span className="kcal-pill">{kcal(n.kcal)}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )
      })}

      {!logs.length && <p className="muted small center">{day === today ? 'Nothing logged yet today. The count starts again at midnight.' : 'Nothing was logged on this day.'}</p>}

      {editing && <AmountSheet key={editing.id} log={editing} day={editing.day} meal={editing.meal} onClose={() => setEditing(null)} />}

      <GoalSheet open={goalOpen} goal={goal} onClose={() => setGoalOpen(false)} onSave={(v) => saveSettings({ kcalGoal: v })} />
    </div>
  )
}

function Ring({ value, goal }: { value: number; goal: number }) {
  const r = 70
  const c = 2 * Math.PI * r
  const p = Math.min(1, goal > 0 ? value / goal : 0)
  const over = value > goal
  return (
    <svg className={over ? 'kring over' : 'kring'} viewBox="0 0 168 168" width="140" height="140" role="img" aria-label={`${kcal(value)} of ${kcal(goal)} kcal`}>
      <circle cx="84" cy="84" r={r} className="kring-track" />
      <circle cx="84" cy="84" r={r} className="kring-fill" strokeDasharray={`${c * p} ${c}`} transform="rotate(-90 84 84)" />
      <text x="84" y="80" textAnchor="middle" className="kring-pct">
        {Math.round((goal > 0 ? value / goal : 0) * 100)}%
      </text>
      <text x="84" y="102" textAnchor="middle" className="kring-sub">
        of goal
      </text>
    </svg>
  )
}

function GoalSheet({ open, goal, onClose, onSave }: { open: boolean; goal: number; onClose: () => void; onSave: (v: number) => void }) {
  const [v, setV] = useState(goal)
  useEffect(() => {
    if (open) setV(goal)
  }, [open, goal])
  return (
    <Sheet open={open} onClose={onClose} title="Daily calorie goal">
      <Stepper label="Goal" unit="kcal" step={50} min={0} value={v} onChange={setV} big />
      <button
        type="button"
        className="btn primary"
        onClick={() => {
          onSave(Math.round(v))
          onClose()
        }}
      >
        Save goal
      </button>
    </Sheet>
  )
}

export function FoodThumb({ food, className = 'thumb' }: { food: { name: string; photo?: string }; className?: string }) {
  if (food.photo) return <Photo id={food.photo} alt="" className={className} />
  return (
    <div className={className + ' glyph food-glyph'} aria-hidden="true">
      {food.name
        .split(/[\s,(]+/)
        .filter((w) => /^[A-Za-z]/.test(w))
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('')}
    </div>
  )
}

const QUICK: Record<FoodUnit, number[]> = { g: [10, 15, 30, 50, 100], ml: [50, 100, 200, 250], pc: [0.5, 1, 2, 3] }

/** Log a food, or change one already logged: amount, meal, and a live total. */
function AmountSheet({ food, log, day, meal, onClose, onDone }: { food?: Food; log?: FoodLog; day: string; meal: Meal; onClose: () => void; onDone?: () => void }) {
  const { foodLog, saveLog, deleteLog, notify, go } = useStore()
  const last = food ? [...foodLog].reverse().find((l) => l.foodId === food.id) : undefined
  const unit = log?.unit ?? food!.unit
  const [amount, setAmount] = useState(() => log?.amount ?? last?.amount ?? food?.serving?.amount ?? food?.per ?? 100)
  const [m, setM] = useState<Meal>(meal)
  const [remove, setRemove] = useState(false)
  const n: Nutrients = log ? logNutrients({ ...log, amount }) : foodNutrients(food!, amount)
  const serving = food?.serving
  const name = log ? foodTitle(log) : foodTitle(food!)

  const save = async () => {
    if (!(amount > 0)) return
    if (log) {
      await saveLog({ ...log, amount, meal: m })
      notify('Updated')
    } else {
      const f = food!
      await saveLog({ id: uid(), day, meal: m, foodId: f.id, name: f.name, brand: f.brand, unit: f.unit, amount, per: f.per, base: f.n, at: Date.now(), updatedAt: Date.now() })
      notify(`Added ${kcal(n.kcal)} kcal to ${mealLabel(m)}`)
    }
    onClose()
    onDone?.()
  }

  return (
    <Sheet open onClose={onClose} title={name}>
      <div className="amount-preview">
        <span className="stat-val big">{kcal(n.kcal)}</span>
        <span className="muted"> kcal</span>
        <div className="muted small">
          Protein {grams(n.protein ?? 0)} g · Carbs {grams(n.carbs ?? 0)} g · Fat {grams(n.fat ?? 0)} g
        </div>
      </div>
      <Stepper label="Amount" unit={unit} step={unit === 'pc' ? 0.5 : 5} min={0} value={amount} onChange={setAmount} big />
      <div className="chips wrap">
        {serving && (
          <>
            <Chip on={amount === serving.amount} onClick={() => setAmount(serving.amount)}>
              {serving.label} · {fmtAmount(serving.amount, unit)}
            </Chip>
            <Chip on={amount === serving.amount * 2} onClick={() => setAmount(serving.amount * 2)}>
              2 × {serving.label.replace(/^1\s+/, '')}
            </Chip>
          </>
        )}
        {QUICK[unit].map((q) => (
          <Chip key={q} on={amount === q && serving?.amount !== q} onClick={() => setAmount(q)}>
            {fmtAmount(q, unit)}
          </Chip>
        ))}
      </div>
      {last && !log && <p className="muted small">Last time: {fmtAmount(last.amount, unit)}</p>}
      <div className="chips wrap" aria-label="Meal">
        {MEALS.map((x) => (
          <Chip key={x.id} on={m === x.id} onClick={() => setM(x.id)}>
            {x.label}
          </Chip>
        ))}
      </div>
      <button type="button" className="btn primary" disabled={!(amount > 0)} onClick={save}>
        {log ? 'Save' : `Add to ${mealLabel(m)}`}
      </button>
      {log ? (
        <button type="button" className="btn danger-ghost" onClick={() => setRemove(true)}>
          Remove from {dayLabel(log.day)}
        </button>
      ) : (
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            onClose()
            go({ name: 'foodEdit', id: food!.id, day, meal: m })
          }}
        >
          Edit {food!.name}
        </button>
      )}
      <Confirm
        open={remove}
        title="Remove this?"
        action="Remove"
        danger
        onClose={() => setRemove(false)}
        onConfirm={async () => {
          await deleteLog(log!.id)
          notify('Removed')
          onClose()
        }}
      />
    </Sheet>
  )
}

/** All foods. With a day it's the picker: tap a food, set the amount, add. Without one it manages your foods. */
export function FoodList({ day, meal, pick }: { day?: string; meal?: Meal; pick?: string }) {
  const { foods, food, foodLog, go, resetTo } = useStore()
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<Food | undefined>(() => (pick ? food(pick) : undefined))
  const picking = !!day
  const recent = useMemo(() => {
    const seen = new Set<string>()
    const out: Food[] = []
    for (let i = foodLog.length - 1; i >= 0 && out.length < 8; i--) {
      const f = food(foodLog[i].foodId)
      if (f && !seen.has(f.id)) {
        seen.add(f.id)
        out.push(f)
      }
    }
    return out
  }, [foodLog, food])
  const needle = q.trim().toLowerCase()
  const list = foods
    .filter((f) => !needle || f.name.toLowerCase().includes(needle) || f.brand?.toLowerCase().includes(needle))
    .sort((a, b) => Number(!!a.sample) - Number(!!b.sample) || a.name.localeCompare(b.name))
  const tap = (f: Food) => (picking ? setPicked(f) : go({ name: 'foodEdit', id: f.id }))

  return (
    <div className="screen">
      <TopBar
        title={picking ? `Add to ${mealLabel(meal ?? 'snack')}` : 'My foods'}
        sub={picking ? dayLabel(day!) : undefined}
        right={
          <button type="button" className="btn small primary" onClick={() => go({ name: 'foodEdit', day, meal })}>
            <Icon name="plus" size={16} /> New
          </button>
        }
      />
      <div className="search">
        <Icon name="search" />
        <input placeholder="Search food or brand" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search foods" />
      </div>

      {picking && !needle && recent.length > 0 && (
        <section className="block" aria-label="Recent">
          <h2>Recent</h2>
          <div className="food-tiles">
            {recent.map((f) => (
              <button key={f.id} type="button" className="food-tile" onClick={() => setPicked(f)}>
                <FoodThumb food={f} className="food-tile-img" />
                <span className="food-tile-name">{f.name}</span>
                {f.brand && <span className="food-tile-brand">{f.brand}</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="block" aria-label="All foods">
        {picking && !needle && recent.length > 0 && <h2>All foods</h2>}
        <ul className="list compact">
          {list.map((f) => (
            <li key={f.id}>
              <button type="button" className="list-row" onClick={() => tap(f)}>
                <FoodThumb food={f} />
                <span className="list-main">
                  <span className="list-name">{f.name}</span>
                  <span className="list-sub">
                    {f.brand ? `${f.brand} · ` : ''}
                    {kcal(f.n.kcal)} kcal per {fmtAmount(f.per, f.unit)}
                  </span>
                </span>
                {!picking && <Icon name="next" className="chev" />}
              </button>
            </li>
          ))}
        </ul>
        {!list.length && (
          <Empty
            title="No food matches"
            body="Add it with the values from the back of the pack."
            action={
              <button type="button" className="btn primary" onClick={() => go({ name: 'foodEdit', day, meal })}>
                New food
              </button>
            }
          />
        )}
      </section>

      {picked && day && <AmountSheet key={picked.id} food={picked} day={day} meal={meal ?? 'snack'} onClose={() => setPicked(undefined)} onDone={() => resetTo([{ name: 'health' }])} />}
    </div>
  )
}

type Draft = Omit<Food, 'n' | 'per' | 'serving'> & { per: string; n: Record<keyof Nutrients, string>; servingLabel: string; servingAmount: string }

const toText = (v: number | undefined) => (v === undefined ? '' : String(v))
const toNum = (t: string) => {
  const n = parseFloat(t.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

/** Create or edit a food: name, brand, a photo of the pack, and the label's values for the amount it prints. */
export function FoodEdit({ id, day, meal }: { id?: string; day?: string; meal?: Meal }) {
  const { food, foods, saveFood, deleteFood, back, replace, notify } = useStore()
  const original = id ? food(id) : undefined
  const [d, setD] = useState<Draft>(() => {
    const f = original
    const n = {} as Record<keyof Nutrients, string>
    for (const { key } of NUTRIENTS) n[key] = toText(f?.n[key])
    return {
      id: f?.id ?? uid(),
      name: f?.name ?? '',
      brand: f?.brand,
      photo: f?.photo,
      unit: f?.unit ?? 'g',
      per: toText(f?.per ?? 100),
      n,
      servingLabel: f?.serving?.label ?? '',
      servingAmount: toText(f?.serving?.amount),
      source: f?.source,
      sample: f?.sample,
      createdAt: f?.createdAt ?? Date.now(),
      updatedAt: f?.updatedAt ?? Date.now(),
    }
  })
  const [added, setAdded] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }))
  // Pieces are almost always "per 1"; weights and volumes "per 100". Only swap the default, not a typed amount.
  const switchUnit = (u: FoodUnit) =>
    setD((x) => ({ ...x, unit: u, per: u === 'pc' && x.per === '100' ? '1' : u !== 'pc' && x.unit === 'pc' && x.per === '1' ? '100' : x.per }))
  const setN = (k: keyof Nutrients, v: string) => /^\d*([.,]\d*)?$/.test(v) && setD((x) => ({ ...x, n: { ...x.n, [k]: v } }))

  const addPhoto = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    const pid = uid()
    await savePhoto(pid, await resizeImage(file, 900))
    setAdded((a) => [...a, pid])
    set({ photo: pid })
    setBusy(false)
  }

  const cancel = async () => {
    for (const p of added) await deletePhoto(p)
    back()
  }

  const name = d.name.trim()
  const brand = d.brand?.trim() || undefined
  const per = toNum(d.per)
  const kcalVal = toNum(d.n.kcal)
  const twin = foods.find((f) => f.id !== d.id && f.name.toLowerCase() === name.toLowerCase() && (f.brand ?? '').toLowerCase() === (brand ?? '').toLowerCase())

  const save = async () => {
    if (!name) return notify('Give it a name first')
    if (!per) return notify('Enter the amount the label values are for')
    if (kcalVal === undefined) return notify('Enter the calories from the label')
    const n = { kcal: kcalVal } as Nutrients
    for (const { key } of NUTRIENTS) if (key !== 'kcal' && toNum(d.n[key]) !== undefined) n[key] = toNum(d.n[key])
    const servingAmount = d.unit === 'pc' ? undefined : toNum(d.servingAmount)
    const next: Food = {
      id: d.id,
      name,
      brand,
      photo: d.photo,
      unit: d.unit,
      per,
      n,
      serving: servingAmount ? { label: d.servingLabel.trim() || '1 serving', amount: servingAmount } : undefined,
      source: d.source,
      sample: d.sample,
      createdAt: d.createdAt,
      updatedAt: Date.now(),
    }
    // Photos replaced during this edit, and the old one if it changed.
    for (const p of added) if (p !== next.photo) await deletePhoto(p)
    if (original?.photo && original.photo !== next.photo) await deletePhoto(original.photo)
    await saveFood(next)
    notify('Saved')
    if (day) replace({ name: 'foods', day, meal, pick: next.id })
    else back()
  }

  return (
    <div className="screen form">
      <TopBar
        title={original ? 'Edit food' : 'New food'}
        onBack={cancel}
        right={
          <button type="button" className="btn small primary" onClick={save} disabled={busy}>
            Save
          </button>
        }
      />

      <div className="food-head">
        <button type="button" className="food-photo" aria-label={d.photo ? 'Change photo' : 'Add photo'} onClick={() => fileRef.current?.click()}>
          {d.photo ? <Photo id={d.photo} alt="" className="food-photo-img" /> : <Icon name="camera" size={28} />}
          <span className="food-photo-label">{d.photo ? 'Change' : 'Photo'}</span>
        </button>
        <input ref={fileRef} id="food-photo" type="file" accept="image/*" hidden aria-label="Food photo" onChange={(x) => addPhoto(x.target.files?.[0]).then(() => (x.target.value = ''))} />
        <div className="stack grow">
          <div className="field">
            <label htmlFor="food-name">Name</label>
            <input id="food-name" value={d.name} placeholder="e.g. Salted cashews" onChange={(x) => set({ name: x.target.value })} autoFocus={!original} />
          </div>
          <div className="field">
            <label htmlFor="food-brand">Brand</label>
            <input id="food-brand" value={d.brand ?? ''} placeholder="Optional" onChange={(x) => set({ brand: x.target.value })} />
          </div>
        </div>
      </div>
      {d.photo && (
        <button type="button" className="link-btn small" onClick={() => set({ photo: undefined })}>
          Remove photo
        </button>
      )}
      {twin && <p className="warn small">You already have {foodTitle(twin)}. Add a brand to tell them apart.</p>}

      <section className="block">
        <h2>Nutrition on the label</h2>
        <div className="per-row">
          <label htmlFor="food-per">Values per</label>
          <input id="food-per" inputMode="decimal" value={d.per} onChange={(x) => /^\d*([.,]\d*)?$/.test(x.target.value) && set({ per: x.target.value })} />
          <div className="segmented" role="tablist" aria-label="Unit">
            {(['g', 'ml', 'pc'] as FoodUnit[]).map((u) => (
              <button key={u} type="button" role="tab" aria-selected={d.unit === u} onClick={() => switchUnit(u)}>
                {u === 'pc' ? 'piece' : u}
              </button>
            ))}
          </div>
        </div>
        <p className="muted small">
          {d.unit === 'pc'
            ? 'For things you eat whole, like a Kathi roll: enter the values for 1 piece, then log how many you had.'
            : 'Type the amount printed above the values, for example 100 g or a 30 g serving. The app works out what you ate from the grams you log.'}
        </p>
        <div className="nutri-grid">
          {NUTRIENTS.map(({ key, label, unit }) => (
            <div key={key} className={key === 'sugar' || key === 'satFat' ? 'field nutri sub' : 'field nutri'}>
              <label htmlFor={'n-' + key}>
                {label} <span className="muted">({unit})</span>
              </label>
              <input id={'n-' + key} inputMode="decimal" autoComplete="off" value={d.n[key]} placeholder={key === 'kcal' ? 'Required' : '-'} onChange={(x) => setN(key, x.target.value)} />
            </div>
          ))}
        </div>
        {per && kcalVal !== undefined && per !== 100 && d.unit !== 'pc' && (
          <p className="muted small">
            That's {kcal((kcalVal * 100) / per)} kcal per 100 {d.unit}.
          </p>
        )}
      </section>

      {d.unit !== 'pc' && (
        <section className="block">
          <h2>Usual portion</h2>
          <p className="muted small">Optional. Shown as a one-tap amount, for example 1 roti = 40 g.</p>
          <div className="row-2">
            <div className="field">
              <label htmlFor="srv-label">Portion</label>
              <input id="srv-label" value={d.servingLabel} placeholder="1 handful" onChange={(x) => set({ servingLabel: x.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="srv-amount">Amount ({d.unit})</label>
              <input id="srv-amount" inputMode="decimal" value={d.servingAmount} placeholder="25" onChange={(x) => /^\d*([.,]\d*)?$/.test(x.target.value) && set({ servingAmount: x.target.value })} />
            </div>
          </div>
        </section>
      )}

      {d.source && <p className="muted small">Starter values: {d.source}.</p>}

      {original && (
        <button type="button" className="btn danger-ghost" onClick={() => setConfirmDelete(true)}>
          Delete food
        </button>
      )}
      <Confirm
        open={confirmDelete}
        title={`Delete ${original?.name ?? 'food'}?`}
        body="Days you already logged keep their numbers."
        action="Delete"
        danger
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          for (const p of added) await deletePhoto(p)
          await deleteFood(d.id)
          notify('Deleted')
          if (day) replace({ name: 'foods', day, meal })
          else back()
        }}
      />
    </div>
  )
}
