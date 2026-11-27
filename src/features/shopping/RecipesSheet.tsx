import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Pencil, Plus, ShoppingCart } from 'lucide-react'
import { addToList, db, type Ingredient, type Recipe } from '../../lib/db'
import { Button, Field, IconButton, Sheet, inputClass } from '../../components/ui'
import { confirmDialog } from '../../components/Confirm'
import { IngredientEditor } from '../../components/IngredientEditor'
import { toast } from '../../components/Toast'

const EMOJIS = ['🥗', '🍝', '🍛', '🌮', '🍕', '🍲', '🥘', '🍜', '🥪', '🍳', '🥞', '🍔', '🍣', '🥙', '🍰', '🥤']

type Draft = { id?: number; name: string; emoji: string; ingredients: Ingredient[] }
const blank = (): Draft => ({ name: '', emoji: EMOJIS[0], ingredients: [] })

/** Rezepte verwalten – öffnet sich aus der Einkaufsliste. Beim Bearbeiten ersetzt der Editor das Sheet, danach geht es zurück zur Übersicht. */
export function RecipesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const recipes = useLiveQuery(() => db.recipes.orderBy('name').toArray(), [])
  const [editing, setEditing] = useState<Draft | null>(null)

  if (!open) return null
  if (editing) return <RecipeEditor draft={editing} onClose={() => setEditing(null)} />

  const addRecipe = async (r: Recipe) => {
    await addToList(r.ingredients)
    toast(`${r.emoji} ${r.ingredients.length} Zutaten aus „${r.name}“ hinzugefügt`)
  }

  return (
    <Sheet open onClose={onClose} title="Rezepte">
      <div className="space-y-3 pt-1 pb-2">
        <Button variant="secondary" className="w-full" onClick={() => setEditing(blank())}>
          <Plus size={18} /> Neues Rezept
        </Button>

        {recipes?.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">Noch keine Rezepte. Lege eines an und setze die Zutaten später mit einem Tipp auf die Liste.</p>
        )}

        <ul className="space-y-2">
          {recipes?.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-3xl bg-bg p-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface text-2xl">{r.emoji}</div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">{r.name}</h3>
                <p className="truncate text-sm text-muted">{r.ingredients.map((i) => i.name).join(', ') || 'Keine Zutaten'}</p>
              </div>
              <IconButton label={`${r.name} bearbeiten`} tone="danger" onClick={() => setEditing({ ...r })}>
                <Pencil size={17} />
              </IconButton>
              {r.ingredients.length > 0 && (
                <IconButton label={`Zutaten von ${r.name} auf die Liste`} tone="brand" onClick={() => addRecipe(r)}>
                  <ShoppingCart size={18} />
                </IconButton>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  )
}

function RecipeEditor({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const [d, setD] = useState(draft)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!d.name.trim()) return
    const data = { name: d.name.trim(), emoji: d.emoji, ingredients: d.ingredients.filter((i) => i.name.trim()) }
    if (d.id) await db.recipes.update(d.id, data)
    else await db.recipes.add({ ...data, createdAt: Date.now() } as Recipe)
    onClose()
  }

  const remove = async () => {
    if (d.id && await confirmDialog(`Rezept „${d.name}“ löschen?`)) {
      await db.recipes.delete(d.id)
      onClose()
    }
  }

  return (
    <Sheet open onClose={onClose} title={d.id ? 'Rezept bearbeiten' : 'Neues Rezept'}>
      <form onSubmit={save} className="space-y-5 pt-1 pb-2">
        <Field label="Name">
          <input autoFocus={!d.id} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="z. B. Bowl" className={inputClass} />
        </Field>

        <div>
          <span className="mb-1.5 block text-sm font-semibold">Symbol</span>
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setD({ ...d, emoji: em })}
                className={`grid size-10 place-items-center rounded-xl text-xl transition ${d.emoji === em ? 'bg-brand-soft ring-2 ring-brand' : 'bg-bg'}`}
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-semibold">Zutaten</span>
          <IngredientEditor value={d.ingredients} onChange={(ingredients) => setD({ ...d, ingredients })} />
        </div>

        <div className="flex gap-2 pt-1">
          {d.id && (
            <Button variant="ghost" onClick={remove} className="text-red-600">
              Löschen
            </Button>
          )}
          <Button type="submit" disabled={!d.name.trim()} className="flex-1">
            Speichern
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
