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

/** Bekanntes Produkt für Vorschläge und die Produktauswahl. Wird beim Einkaufen und in Rezepten/Listen automatisch gemerkt. */
export interface Product {
  /** Aus dem Namen abgeleitet (productId), damit Geräte beim Sync nicht doppelt anlegen */
  id: string
  name: string
  category: CategoryId
  /** Wie oft auf die Einkaufsliste gesetzt – für die Reihenfolge der Vorschläge */
  uses: number
  lastUsed?: number
  createdAt: number
}

// ---------- Haushaltsübersicht ----------

export type ContractKind = 'miete' | 'strom' | 'gas' | 'internet'
export type CostKind = ContractKind | 'sonstig'
export type Interval = 'monat' | 'quartal' | 'jahr'
/** Kündigungsfrist: Anzahl + w (Wochen) oder m (Monate) */
export type Notice = '2w' | '4w' | '1m' | '3m' | '6m'

/** Fixkosten-Posten. Miete, Strom, Gas und Internet gibt es je einmal und sie bringen Vertragsdetails mit. */
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
  /** Strom/Gas: Grundpreis in Euro pro Monat */
  basePrice?: number
  /** Strom/Gas: Arbeitspreis in Cent pro kWh */
  unitPrice?: number
  /** Strom/Gas: Verbrauch in kWh pro Jahr */
  annualUsage?: number
  /** Miete: Kaltmiete in Euro pro Monat (amount = Kaltmiete + Nebenkosten) */
  coldRent?: number
  /** Miete: Nebenkosten-Vorauszahlung in Euro pro Monat */
  utilities?: number
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
  /** Punkte-Stufe; leer = Standardstufe der Kategorie (bzw. „leicht“) */
  level?: Level
  /** Erledigt und aus der Liste entfernt – bleibt für die Wochenrückblicke erhalten */
  archived?: boolean
  /** Veraltet (bis DB v4), in v5 zu `category` migriert */
  tags?: string[]
  createdAt: number
}

/** Punkte-Stufen für To-dos. Gespeichert wird nur die Stufe, die Punktzahl kommt aus LEVEL_POINTS (features/goals/points.ts). */
export type Level = 'leicht' | 'mittel' | 'wichtig'

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
  /** Standard-Punktestufe für neue To-dos dieser Kategorie */
  level?: Level
  /** Punkteziel pro Woche */
  weeklyGoal?: number
  createdAt: number
}

/** Einstellungen, die über das Konto synchronisiert werden (ein Datensatz pro Thema). */
export interface PointsSettings {
  id: 'points'
  enabled: boolean
  /** Punkteziel pro Woche, gesamt */
  weeklyGoal?: number
}
export type Setting = PointsSettings

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
  products: EntityTable<Product, 'id'>
  settings: EntityTable<Setting, 'id'>
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

db.version(9).stores({
  products: 'id, name',
})

db.version(10).stores({
  settings: 'id',
})

/** Weltweit eindeutige ID für Datensätze (crypto.randomUUID fehlt bei http im WLAN, getRandomValues nicht). */
export function newId() {
  const b = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

/** Kurze, eindeutige ID für eingebettete Objekte (Unterziele). */
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)


const norm = (s: string) => s.trim().toLowerCase()

/** Gleicher Name (ohne Groß-/Kleinschreibung, Leerzeichen) → gleiche ID, auf allen Geräten. */
export const productId = (name: string) => 'p:' + norm(name).replace(/\s+/g, ' ')

/**
 * Merkt sich Produkte. `used`: zählt als Einkauf (für die Reihenfolge der Vorschläge) – nicht beim bloßen Speichern
 * eines Rezepts. Vorhandene Produkte behalten Schreibweise und Kategorie.
 */
export async function rememberProducts(items: Array<{ name: string; category?: CategoryId }>, used = true) {
  const now = Date.now()
  await db.transaction('rw', db.products, async () => {
    for (const raw of items) {
      const name = raw.name.trim().replace(/\s+/g, ' ')
      if (!name) continue
      const id = productId(name)
      const existing = await db.products.get(id)
      if (existing) {
        if (used) await db.products.update(id, { uses: existing.uses + 1, lastUsed: now })
      } else {
        await db.products.add({
          id,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          category: raw.category ?? guessCategory(name),
          uses: used ? 1 : 0,
          lastUsed: used ? now : undefined,
          createdAt: now,
        })
      }
    }
  })
}

export const deleteProduct = (id: string) => db.products.delete(id)

/** Kategorie eines Produkts von Hand ändern; offene Einträge auf der Liste wandern gleich mit. */
export async function setProductCategory(product: Product, category: CategoryId) {
  await db.transaction('rw', db.products, db.listItems, async () => {
    await db.products.update(product.id, { category })
    await db.listItems.filter((i) => productId(i.name) === product.id).modify({ category })
  })
}

/** Einmalig: Produkte aus vorhandener Liste, Rezepten und gespeicherten Listen übernehmen. */
export async function seedProducts() {
  const KEY = 'products:seeded'
  if (localStorage.getItem(KEY)) return
  const [items, recipes, templates] = await Promise.all([db.listItems.toArray(), db.recipes.toArray(), db.templates.toArray()])
  await rememberProducts([...items, ...recipes.flatMap((r) => r.ingredients), ...templates.flatMap((t) => t.items)], false)
  localStorage.setItem(KEY, '1')
}

/** Fügt Zutaten zur Einkaufsliste hinzu. Bereits vorhandene Produkte werden zusammengeführt statt doppelt angelegt. */
export async function addToList(items: Array<Partial<Ingredient> & { name: string }>) {
  await rememberProducts(items)
  // Die Kategorie des gemerkten Produkts hat Vorrang – sie kann von Hand korrigiert worden sein.
  const products = new Map((await db.products.bulkGet(items.map((i) => productId(i.name)))).flatMap((p) => (p ? [[p.id, p]] : [])))
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
          category: products.get(productId(name))?.category ?? raw.category ?? guessCategory(name),
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
