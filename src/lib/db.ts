import Dexie, { type EntityTable } from 'dexie'
import { guessCategory, type CategoryId } from './categories'

export interface Ingredient {
  name: string
  quantity: string
  category: CategoryId
}

export interface ListItem extends Ingredient {
  id: string
  checked: boolean
  createdAt: number
}

export interface Recipe {
  id: string
  name: string
  emoji: string
  ingredients: Ingredient[]
  createdAt: number
}

export interface Template {
  id: string
  name: string
  items: Ingredient[]
  createdAt: number
}

// ---------- Haushaltsübersicht ----------

export type ContractKind = 'strom' | 'gas' | 'internet'
export type CostKind = ContractKind | 'sonstig'
export type Interval = 'monat' | 'quartal' | 'jahr'
/** Kündigungsfrist: Anzahl + w (Wochen) oder m (Monate) */
export type Notice = '2w' | '4w' | '1m' | '3m' | '6m'

/** Fixkosten-Posten. Strom, Gas und Internet gibt es je einmal und sie bringen Vertragsdetails mit. */
export interface FixedCost {
  id: string
  kind: CostKind
  name: string
  /** Betrag in Euro pro `interval` */
  amount: number
  interval: Interval
  provider?: string
  contractNumber?: string
  meterNumber?: string
  /** YYYY-MM-DD */
  contractEnd?: string
  notice?: Notice
  note?: string
  createdAt: number
}

// ---------- Ziele & To-dos ----------

export interface Todo {
  id: string
  title: string
  /** Fälligkeit YYYY-MM-DD; leer = ohne Termin */
  due?: string
  done: boolean
  doneAt?: number
  /** ID einer GoalCategory */
  category?: string
  /** Veraltet (bis DB v4), in v5 zu `category` migriert */
  tags?: string[]
  createdAt: number
}

export type HabitFrequency = 'daily' | 'weekly'

/** Gewohnheit, die täglich oder x-mal pro Woche abgehakt wird. */
export interface Habit {
  id: string
  title: string
  frequency: HabitFrequency
  /** Nur bei weekly: Ziel pro Woche (1–7) */
  perWeek?: number
  /** ID einer GoalCategory */
  category?: string
  /** Abgehakte Tage als YYYY-MM-DD, aufsteigend sortiert */
  log: string[]
  createdAt: number
}

/** Frei angelegte Kategorie für Ziele, To-dos und Habits, z. B. „Masterprojekt“ mit Symbol (Schlüssel aus components/icons.tsx). */
export interface GoalCategory {
  id: string
  name: string
  emoji?: string
  createdAt: number
}

export interface SubGoal {
  id: string
  title: string
  done: boolean
}

/** Veraltet (DB v4): Symbol je Tag. In v5 zu GoalCategory migriert. */
export interface TagMeta {
  /** Tag-Name in Kleinbuchstaben (Tags sind unabhängig von Groß-/Kleinschreibung) */
  key: string
  name: string
  emoji?: string
}

export interface Goal {
  id: string
  title: string
  /** Veraltet: Ziele haben kein Symbol mehr, Symbole gehören zu Kategorien. Wird nicht mehr angezeigt. */
  emoji?: string
  /** ID einer GoalCategory */
  category?: string
  note?: string
  /** YYYY-MM-DD, optional */
  targetDate?: string
  subgoals: SubGoal[]
  done: boolean
  /** Veraltet (bis DB v4), in v5 zu `category` migriert */
  tags?: string[]
  createdAt: number
}

export const db = new Dexie('haushalt') as Dexie & {
  listItems: EntityTable<ListItem, 'id'>
  recipes: EntityTable<Recipe, 'id'>
  templates: EntityTable<Template, 'id'>
  fixedCosts: EntityTable<FixedCost, 'id'>
  todos: EntityTable<Todo, 'id'>
  goals: EntityTable<Goal, 'id'>
  tagMeta: EntityTable<TagMeta, 'key'>
  goalCategories: EntityTable<GoalCategory, 'id'>
  habits: EntityTable<Habit, 'id'>
}

db.version(1).stores({
  listItems: '++id, name, category',
  recipes: '++id, name',
  templates: '++id, name',
})

// Booleans (done) sind in IndexedDB keine gültigen Index-Schlüssel – daher nicht indiziert.
db.version(2).stores({
  fixedCosts: '++id, kind',
  todos: '++id, due',
  goals: '++id',
})

// Tags als Multi-Entry-Index (*tags), damit später auch direkt danach gefiltert werden kann.
db.version(3).stores({
  todos: '++id, due, *tags',
  goals: '++id, *tags',
})

db.version(4).stores({
  tagMeta: 'key',
})

// Tags → Kategorien: je Eintrag höchstens eine Kategorie (der erste Tag), Symbole aus tagMeta werden übernommen.
db.version(5)
  .stores({
    goalCategories: 'id',
    todos: '++id, due, category',
    goals: '++id, category',
  })
  .upgrade(async (tx) => {
    const meta = (await tx.table('tagMeta').toArray()) as TagMeta[]
    const byKey = new Map<string, GoalCategory>()
    const ensure = (name: string) => {
      const key = name.toLowerCase()
      let c = byKey.get(key)
      if (!c) {
        const m = meta.find((x) => x.key === key)
        c = { id: uid(), name: m?.name ?? name, emoji: m?.emoji, createdAt: Date.now() }
        byKey.set(key, c)
      }
      return c
    }
    for (const m of meta) ensure(m.name)
    const migrate = (row: { tags?: string[]; category?: string }) => {
      if (row.tags?.length) row.category = ensure(row.tags[0]).id
      delete row.tags
    }
    await tx.table('goals').toCollection().modify(migrate)
    await tx.table('todos').toCollection().modify(migrate)
    await tx.table('goalCategories').bulkAdd([...byKey.values()])
  })

db.version(6).stores({
  habits: '++id, category',
})

// v7/v8: Zahlen-IDs (++id) → zufällige Text-IDs, damit Einträge von mehreren Geräten beim Sync nicht kollidieren.
// IndexedDB kann den Primärschlüssel nicht ändern, daher in zwei Schritten über Zwischentabellen (*_v7).
const RENUMBERED = {
  listItems: 'id, name, category',
  recipes: 'id, name',
  templates: 'id, name',
  fixedCosts: 'id, kind',
  todos: 'id, due, category',
  goals: 'id, category',
  habits: 'id, category',
} as const
const names = Object.keys(RENUMBERED) as Array<keyof typeof RENUMBERED>

db.version(7)
  .stores(Object.fromEntries(names.flatMap((n) => [[n, null], [`${n}_v7`, RENUMBERED[n]]])))
  .upgrade(async (tx) => {
    for (const n of names) {
      const rows = await tx.table(n).toArray()
      await tx.table(`${n}_v7`).bulkAdd(rows.map((r) => ({ ...r, id: newId() })))
    }
  })

db.version(8)
  .stores(Object.fromEntries(names.flatMap((n) => [[`${n}_v7`, null], [n, RENUMBERED[n]]])))
  .upgrade(async (tx) => {
    for (const n of names) await tx.table(n).bulkAdd(await tx.table(`${n}_v7`).toArray())
  })

/** Weltweit eindeutige ID für Datensätze (crypto.randomUUID fehlt bei http im WLAN, getRandomValues nicht). */
export function newId() {
  const b = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

/** Kurze, eindeutige ID für eingebettete Objekte (Unterziele). */
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)


const norm = (s: string) => s.trim().toLowerCase()

/** Fügt Zutaten zur Einkaufsliste hinzu. Bereits vorhandene Produkte werden zusammengeführt statt doppelt angelegt. */
export async function addToList(items: Array<Partial<Ingredient> & { name: string }>) {
  await db.transaction('rw', db.listItems, async () => {
    const existing = await db.listItems.toArray()
    for (const raw of items) {
      const name = raw.name.trim()
      if (!name) continue
      const quantity = raw.quantity?.trim() ?? ''
      const match = existing.find((e) => norm(e.name) === norm(name))
      if (match) {
        const mergedQty =
          match.checked || !match.quantity ? quantity || match.quantity
          : quantity && quantity !== match.quantity ? `${match.quantity} + ${quantity}`
          : match.quantity
        await db.listItems.update(match.id, { checked: false, quantity: mergedQty })
        Object.assign(match, { checked: false, quantity: mergedQty })
      } else {
        const item = {
          id: newId(),
          name,
          quantity,
          category: raw.category ?? guessCategory(name),
          checked: false,
          createdAt: Date.now(),
        }
        await db.listItems.add(item)
        existing.push(item)
      }
    }
  })
}

export const toggleItem = (item: ListItem) => db.listItems.update(item.id, { checked: !item.checked })
export const deleteItem = (id: string) => db.listItems.delete(id)
export const clearChecked = () => db.listItems.filter((i) => i.checked).delete()
// Nicht clear(): das löst keine Hooks aus, der Sync bekäme das Löschen nicht mit.
export const clearList = () => db.listItems.toCollection().delete()

export async function saveListAsTemplate(name: string) {
  const items = await db.listItems.toArray()
  await db.templates.add({
    id: newId(),
    name: name.trim(),
    items: items.map(({ name, quantity, category }) => ({ name, quantity, category })),
    createdAt: Date.now(),
  } as Template)
}

/** Legt beim allerersten Start ein Beispielrezept an. */
export async function seedIfEmpty() {
  if ((await db.recipes.count()) > 0 || (await db.listItems.count()) > 0) return
  if ((await db.templates.count()) > 0) return
  const ing = (name: string, quantity = ''): Ingredient => ({ name, quantity, category: guessCategory(name) })
  await db.recipes.add({
    id: newId(),
    name: 'Bowl',
    emoji: 'salad',
    ingredients: [
      ing('Reis', '250 g'),
      ing('Avocado', '1'),
      ing('Edamame', '200 g'),
      ing('Gurke', '1'),
      ing('Karotte', '2'),
      ing('Tofu', '200 g'),
      ing('Sojasauce'),
      ing('Sesam'),
    ],
    createdAt: Date.now(),
  } as Recipe)
}
