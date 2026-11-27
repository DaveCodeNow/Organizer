import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Product } from '../../lib/db'
import { CATEGORIES } from '../../lib/categories'
import { parseEntry } from '../../lib/parse'
import { suggestProducts } from '../../lib/products'

export const categoryIcon = (id: string) => (CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]).icon

/**
 * Vorschläge aus den gemerkten Produkten zur aktuellen Eingabe (Menge davor wird ignoriert: „2 Tom“ → Tomaten).
 * Tippen übernimmt das Produkt; die Tastatur bleibt dabei offen.
 */
export function ProductSuggestions({ query, onPick }: { query: string; onPick: (p: Product, quantity: string) => void }) {
  const products = useLiveQuery(() => db.products.toArray(), [], [] as Product[])
  const { name, quantity } = parseEntry(query)
  const list = suggestProducts(products, name)
  if (!list.length) return null

  return (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]" aria-label="Vorschläge">
      {list.map((p) => {
        const Icon = categoryIcon(p.category)
        return (
          <button
            key={p.id}
            type="button"
            // Verhindert, dass das Eingabefeld den Fokus verliert (Tastatur bliebe sonst nicht offen)
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(p, quantity)}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm font-medium transition active:scale-95"
          >
            <Icon size={15} className="text-muted" />
            {p.name}
          </button>
        )
      })}
    </div>
  )
}
