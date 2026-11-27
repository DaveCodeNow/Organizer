import { useState, type KeyboardEvent } from 'react'
import { Plus, X } from 'lucide-react'
import type { Ingredient } from '../lib/db'
import { guessCategory } from '../lib/categories'
import { parseEntry } from '../lib/parse'
import { inputClass } from './ui'

/** Bearbeitbare Zutatenliste – genutzt für Rezepte und gespeicherte Listen. */
export function IngredientEditor({ value, onChange }: { value: Ingredient[]; onChange: (v: Ingredient[]) => void }) {
  const [draft, setDraft] = useState('')

  const add = () => {
    if (!draft.trim()) return
    const { name, quantity } = parseEntry(draft)
    onChange([...value, { name, quantity, category: guessCategory(name) }])
    setDraft('')
  }

  const update = (idx: number, patch: Partial<Ingredient>) =>
    onChange(
      value.map((ing, i) => {
        if (i !== idx) return ing
        const next = { ...ing, ...patch }
        if (patch.name !== undefined) next.category = guessCategory(next.name)
        return next
      }),
    )

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      add()
    }
  }

  return (
    <div className="space-y-2">
      {value.map((ing, i) => (
        <div key={i} className="flex items-center gap-2">
          {/* Feste Breite über den Wrapper, da inputClass selbst w-full setzt und sonst gewinnt. */}
          <div className="w-24 shrink-0">
            <input
              value={ing.quantity}
              onChange={(e) => update(i, { quantity: e.target.value })}
              placeholder="Menge"
              aria-label="Menge"
              className={`${inputClass} text-center`}
            />
          </div>
          <input
            value={ing.name}
            onChange={(e) => update(i, { name: e.target.value })}
            placeholder="Zutat"
            aria-label="Zutat"
            className={`${inputClass} min-w-0 flex-1`}
          />
          <button
            type="button"
            aria-label={`${ing.name} entfernen`}
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-warn-soft hover:text-warn"
          >
            <X size={18} />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder="Zutat hinzufügen, z. B. 200 g Tofu"
          enterKeyHint="enter"
          className={inputClass}
        />
        <button
          type="button"
          aria-label="Zutat hinzufügen"
          onClick={add}
          disabled={!draft.trim()}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink transition active:scale-95 disabled:opacity-40"
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  )
}
