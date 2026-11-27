import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Pencil, Plus, ShoppingCart } from 'lucide-react'
import { addToList, db, type Ingredient, type Recipe } from '../../lib/db'
import { Button, EmptyState, IconButton, PageHeader, Sheet, inputClass } from '../../components/ui'
import { IngredientEditor } from '../../components/IngredientEditor'
import { toast } from '../../components/Toast'

const EMOJIS = ['🥗', '🍝', '🍛', '🌮', '🍕', '🍲', '🥘', '🍜', '🥪', '🍳', '🥞', '🍔', '🍣', '🥙', '🍰', '🥤']

type Draft = { id?: number; name: string; emoji: string; ingredients: Ingredient[] }

export default function Recipes() {
  const recipes = useLiveQuery(() => db.recipes.orderBy('name').toArray(), [])
  const [editing, setEditing] = useState<Draft | null>(null)

  const addRecipe = async (r: Recipe) => {
    await addToList(r.ingredients)
    toast(`${r.emoji} ${r.ingredients.length} Zutaten aus „${r.name}“ hinzugefügt`)
  }

  if (!recipes) return null

  return (
    <>
      <PageHeader
        title="Rezepte"
        subtitle="Ein Tipp – alle Zutaten auf der Liste"
        action={
          <IconButton label="Neues Rezept" tone="brand" onClick={() => setEditing({ name: '', emoji: EMOJIS[0], ingredients: [] })}>
            <Plus size={22} />
          </IconButton>
        }
      />

      {recipes.length === 0 ? (
        <EmptyState emoji="📖" title="Noch keine Rezepte" text="Lege Rezepte mit ihren Zutaten an und setze sie mit einem Tipp auf die Einkaufsliste.">
          <Button onClick={() => setEditing({ name: '', emoji: EMOJIS[0], ingredients: [] })}>
            <Plus size={18} /> Rezept anlegen
          </Button>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 px-5 sm:grid-cols-2">
          {recipes.map((r) => (
            <article key={r.id} className="flex flex-col rounded-3xl bg-surface p-4 shadow-card">
              <div className="flex items-start gap-3">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-bg text-2xl">{r.emoji}</div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[17px] font-semibold">{r.name}</h3>
                  <p className="line-clamp-2 text-sm text-muted">{r.ingredients.map((i) => i.name).join(', ') || 'Keine Zutaten'}</p>
                </div>
                <IconButton label={`${r.name} bearbeiten`} tone="danger" onClick={() => setEditing({ ...r })}>
                  <Pencil size={17} />
                </IconButton>
              </div>
              <Button variant="secondary" className="mt-4 w-full" disabled={r.ingredients.length === 0} onClick={() => addRecipe(r)}>
                <ShoppingCart size={18} /> Auf die Liste · {r.ingredients.length}
              </Button>
            </article>
          ))}
        </div>
      )}

      {editing && <RecipeEditor draft={editing} onClose={() => setEditing(null)} />}
    </>
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
    if (d.id && confirm(`Rezept „${d.name}“ löschen?`)) {
      await db.recipes.delete(d.id)
      onClose()
    }
  }

  return (
    <Sheet open onClose={onClose} title={d.id ? 'Rezept bearbeiten' : 'Neues Rezept'}>
      <form onSubmit={save} className="space-y-5 pt-1 pb-2">
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Name</label>
          <input autoFocus={!d.id} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="z. B. Bowl" className={inputClass} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Symbol</label>
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setD({ ...d, emoji: em })}
                className={`grid size-10 place-items-center rounded-xl text-xl transition ${
                  d.emoji === em ? 'bg-brand-soft ring-2 ring-brand' : 'bg-bg'
                }`}
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Zutaten</label>
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
