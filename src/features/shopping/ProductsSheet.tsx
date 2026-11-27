import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2 } from 'lucide-react'
import { addToList, db, deleteItem, deleteProduct, type ListItem, type Product } from '../../lib/db'
import { CATEGORIES } from '../../lib/categories'
import { suggestProducts } from '../../lib/products'
import { CheckCircle, IconButton, Sheet, inputClass } from '../../components/ui'
import { toast } from '../../components/Toast'

const norm = (s: string) => s.trim().toLowerCase()

/**
 * Alle gemerkten Produkte nach Supermarkt-Kategorie. Tippen setzt ein Produkt auf die Liste bzw. nimmt es wieder
 * herunter; über den Papierkorb lassen sich vertippte Produkte („Toamten“) dauerhaft entfernen.
 */
export function ProductsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const products = useLiveQuery(() => db.products.toArray(), [], [] as Product[])
  const openItems = useLiveQuery(() => db.listItems.filter((i) => !i.checked).toArray(), [], [] as ListItem[])
  const [query, setQuery] = useState('')

  if (!open) return null

  const onList = new Map(openItems.map((i) => [norm(i.name), i]))
  const shown = query.trim() ? suggestProducts(products, query, Infinity) : products
  const groups = CATEGORIES.map((c) => ({
    ...c,
    items: shown.filter((p) => p.category === c.id).sort((a, b) => a.name.localeCompare(b.name, 'de')),
  })).filter((g) => g.items.length > 0)

  const toggle = (p: Product) => {
    const item = onList.get(norm(p.name))
    return item ? deleteItem(item.id) : addToList([{ name: p.name, category: p.category }])
  }

  const remove = async (p: Product) => {
    await deleteProduct(p.id)
    toast(`„${p.name}“ aus den Produkten gelöscht`)
  }

  const close = () => {
    setQuery('')
    onClose()
  }

  return (
    <Sheet open onClose={close} title="Produkte">
      <div className="space-y-5 pt-1 pb-2">
        {products.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            Noch keine Produkte. Alles, was du auf die Einkaufsliste setzt oder in Rezepten und Listen einträgst, landet automatisch hier.
          </p>
        ) : (
          <>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Produkt suchen" aria-label="Produkte suchen" className={inputClass} />
            <p className="-mt-2 text-sm text-muted">Tippe auf ein Produkt, um es auf die Liste zu setzen. Vertippte Produkte löschst du über den Papierkorb.</p>
          </>
        )}

        {products.length > 0 && groups.length === 0 && <p className="py-4 text-center text-sm text-muted">Nichts gefunden.</p>}

        {groups.map((g) => (
          <section key={g.id}>
            <h3 className="mb-2.5 flex items-center gap-2 font-serif text-[17px] leading-[1.1] font-[600]">
              <g.icon size={17} className="text-muted" />
              {g.label}
            </h3>
            <ul className="overflow-hidden rounded-3xl bg-bg">
              {g.items.map((p) => {
                const listed = onList.has(norm(p.name))
                return (
                  <li key={p.id} className="flex items-center border-b border-line/70 pr-2 last:border-0">
                    <button
                      type="button"
                      onClick={() => toggle(p)}
                      aria-pressed={listed}
                      className="flex min-h-12 min-w-0 flex-1 items-center gap-3 py-2 pl-4 text-left"
                    >
                      <CheckCircle checked={listed} small />
                      <span className="truncate text-[15px]">{p.name}</span>
                    </button>
                    <IconButton label={`${p.name} aus den Produkten löschen`} tone="danger" onClick={() => remove(p)}>
                      <Trash2 size={17} />
                    </IconButton>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </Sheet>
  )
}
