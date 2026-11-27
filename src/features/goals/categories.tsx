import { createContext, useContext, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { db, uid, type GoalCategory } from '../../lib/db'
import { inputClass } from '../../components/ui'

/** Kategorien für Ziele und To-dos (nicht zu verwechseln mit den Supermarkt-Kategorien in lib/categories.ts). */

/** Symbole zur Auswahl für Kategorien (Ziele selbst haben kein Symbol). */
export const EMOJIS = ['🎯', '🎓', '🎵', '💼', '💻', '🧪', '📚', '🏡', '💰', '🏃', '🧘', '❤️', '🌱', '✈️', '🎨', '🛠️', '🚗', '🍳', '🐾', '⭐']

export interface CategoryInfo extends GoalCategory {
  /** Wie viele Ziele und To-dos zur Kategorie gehören */
  count: number
}

const norm = (s: string) => s.trim().replace(/^#+/, '').replace(/\s+/g, ' ')
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/** „🎓 Masterprojekt“ bzw. nur der Name, wenn kein Symbol vergeben ist. */
export const categoryLabel = (c: Pick<GoalCategory, 'name' | 'emoji'>) => (c.emoji ? `${c.emoji} ${c.name}` : c.name)

// ---------- Daten ----------

/** Alle Kategorien alphabetisch, mit Anzahl der Einträge. */
export function useCategoriesQuery() {
  return useLiveQuery(
    async () => {
      const [cats, goals, todos] = await Promise.all([db.goalCategories.toArray(), db.goals.toArray(), db.todos.toArray()])
      const count = new Map<string, number>()
      for (const x of [...goals, ...todos]) if (x.category) count.set(x.category, (count.get(x.category) ?? 0) + 1)
      return cats.map((c) => ({ ...c, count: count.get(c.id) ?? 0 })).sort((a, b) => a.name.localeCompare(b.name, 'de'))
    },
    [],
    [] as CategoryInfo[],
  )
}

/** Der Tab „Ziele & To-dos“ lädt die Kategorien einmal und reicht sie hierüber an alle Bausteine weiter. */
export const CategoriesContext = createContext<CategoryInfo[]>([])
export const useCategories = () => useContext(CategoriesContext)

export const findCategory = (cats: CategoryInfo[], id: string | undefined) => (id ? cats.find((c) => c.id === id) : undefined)

/** Legt eine Kategorie an – oder liefert die vorhandene gleichen Namens. Gibt die ID zurück. */
export async function createCategory(name: string, emoji?: string) {
  const n = norm(name)
  if (!n) return undefined
  const existing = (await db.goalCategories.toArray()).find((c) => same(c.name, n))
  if (existing) {
    if (emoji && !existing.emoji) await db.goalCategories.update(existing.id, { emoji })
    return existing.id
  }
  const id = uid()
  await db.goalCategories.add({ id, name: n, emoji, createdAt: Date.now() })
  return id
}

export async function updateCategory(id: string, patch: { name?: string; emoji?: string | undefined }) {
  const name = patch.name !== undefined ? norm(patch.name) : undefined
  if (name === '') return
  await db.goalCategories.update(id, { ...patch, ...(name !== undefined && { name }) })
}

/** Löscht die Kategorie; Ziele und To-dos bleiben erhalten und sind danach ohne Kategorie. */
export async function deleteCategory(id: string) {
  await db.transaction('rw', db.goals, db.todos, db.goalCategories, async () => {
    await db.goals.where('category').equals(id).modify((g) => void delete g.category)
    await db.todos.where('category').equals(id).modify((t) => void delete t.category)
    await db.goalCategories.delete(id)
  })
}

const HASHTAG = /#([\p{L}\p{N}_-]+)/gu

/** „Paper lesen #Masterprojekt“ → { title: "Paper lesen", category: "Masterprojekt" } (erster Hashtag zählt). */
export function extractHashtag(text: string) {
  const first = [...text.matchAll(HASHTAG)][0]?.[1]
  return { title: text.replace(HASHTAG, '').replace(/\s+/g, ' ').trim(), category: first }
}

// ---------- Bausteine ----------

/** Auswahl aus den Symbolen, optional mit „Ohne“. */
export function EmojiGrid({ value, onPick, allowNone }: { value?: string; onPick: (e: string | undefined) => void; allowNone?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {allowNone && (
        <button
          type="button"
          onClick={() => onPick(undefined)}
          className={`h-10 rounded-xl px-3 text-sm font-medium transition ${!value ? 'bg-brand-soft text-brand-ink ring-2 ring-brand' : 'bg-bg text-muted'}`}
        >
          Ohne
        </button>
      )}
      {EMOJIS.map((em) => (
        <button
          key={em}
          type="button"
          aria-label={`Symbol ${em}`}
          onClick={() => onPick(em)}
          className={`grid size-10 place-items-center rounded-xl text-xl transition ${value === em ? 'bg-brand-soft ring-2 ring-brand' : 'bg-bg'}`}
        >
          {em}
        </button>
      ))}
    </div>
  )
}

/** Eine Kategorie wählen (oder keine) bzw. direkt eine neue anlegen – für Editoren von Zielen und To-dos. */
export function CategoryPicker({ value, onChange }: { value: string | undefined; onChange: (id: string | undefined, emoji?: string) => void }) {
  const cats = useCategories()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState<string | undefined>()
  const [picking, setPicking] = useState(false)

  const chip = (active: boolean) =>
    `h-9 rounded-full border px-3.5 text-sm font-medium transition active:scale-95 ${active ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line bg-surface text-muted'}`

  const create = async () => {
    const id = await createCategory(name, emoji)
    if (!id) return
    onChange(id, emoji)
    setName('')
    setEmoji(undefined)
    setCreating(false)
    setPicking(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange(undefined)} aria-pressed={!value} className={chip(!value)}>
          Keine
        </button>
        {cats.map((c) => (
          <button key={c.id} type="button" onClick={() => onChange(c.id, c.emoji)} aria-pressed={value === c.id} className={chip(value === c.id)}>
            {categoryLabel(c)}
          </button>
        ))}
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className="flex h-9 items-center gap-1 rounded-full px-2 text-sm font-semibold text-brand">
            <Plus size={16} /> Neue Kategorie
          </button>
        )}
      </div>

      {creating && (
        // Kein <form>: der Picker steckt selbst in einem Formular.
        <div className="space-y-2 rounded-3xl bg-bg p-3">
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Symbol wählen"
              onClick={() => setPicking(!picking)}
              className={`grid size-11 shrink-0 place-items-center rounded-2xl bg-surface text-xl shadow-card ${picking ? 'ring-2 ring-brand' : ''}`}
            >
              {emoji ?? <span className="text-sm text-muted">☺︎</span>}
            </button>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  create()
                }
              }}
              placeholder="Name, z. B. Masterprojekt"
              aria-label="Name der neuen Kategorie"
              className={`${inputClass} min-w-0 flex-1`}
            />
            <button
              type="button"
              aria-label="Kategorie anlegen"
              onClick={create}
              disabled={!norm(name)}
              className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand text-white transition active:scale-95 disabled:opacity-40"
            >
              <Plus size={20} />
            </button>
          </div>
          {picking && (
            <EmojiGrid
              value={emoji}
              allowNone
              onPick={(e) => {
                setEmoji(e)
                setPicking(false)
              }}
            />
          )}
          <button type="button" onClick={() => setCreating(false)} className="h-9 px-1 text-sm font-medium text-muted">
            Abbrechen
          </button>
        </div>
      )}
    </div>
  )
}
