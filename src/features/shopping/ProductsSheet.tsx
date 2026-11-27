import { useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Trash2 } from 'lucide-react'
import { addToList, db, deleteItem, deleteProduct, setProductCategory, type ListItem, type Product } from '../../lib/db'
import { CATEGORIES, type CategoryId } from '../../lib/categories'
import { suggestProducts } from '../../lib/products'
import { CheckCircle, IconButton, Sheet, inputClass } from '../../components/ui'
import { toast } from '../../components/Toast'

const norm = (s: string) => s.trim().toLowerCase()

/**
 * Alle gemerkten Produkte nach Supermarkt-Kategorie. Tippen setzt ein Produkt auf die Liste bzw. nimmt es wieder
 * herunter; über den Papierkorb lassen sich vertippte Produkte („Toamten“) dauerhaft entfernen.
 * Langes Drücken (bzw. Rechtsklick) öffnet die Kategorie-Auswahl – bewusst etwas versteckt.
 */
export function ProductsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const products = useLiveQuery(() => db.products.toArray(), [], [] as Product[])
  const openItems = useLiveQuery(() => db.listItems.filter((i) => !i.checked).toArray(), [], [] as ListItem[])
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Product | null>(null)

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
            <p className="-mt-2 text-sm text-muted">
              Tippe auf ein Produkt, um es auf die Liste zu setzen. Gedrückt halten ändert die Kategorie, der Papierkorb löscht vertippte Produkte.
            </p>
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
              {g.items.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  listed={onList.has(norm(p.name))}
                  onToggle={() => toggle(p)}
                  onLongPress={() => setEditing(p)}
                  onDelete={() => remove(p)}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
      {editing && <CategorySheet product={editing} onClose={() => setEditing(null)} />}
    </Sheet>
  )
}

/** Erkennt langes Drücken (Touch und Maus); Rechtsklick zählt am Rechner ebenfalls. Bewegt sich der Finger, wird gescrollt statt gedrückt. */
function useLongPress(onLongPress: () => void, ms = 500) {
  const timer = useRef<number | undefined>(undefined)
  const start = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)
  const cancel = () => {
    clearTimeout(timer.current)
    start.current = null
  }
  const fire = () => {
    cancel()
    if (fired.current) return
    fired.current = true
    navigator.vibrate?.(15)
    onLongPress()
  }
  return {
    handlers: {
      onPointerDown: (e: PointerEvent) => {
        fired.current = false
        start.current = { x: e.clientX, y: e.clientY }
        timer.current = window.setTimeout(fire, ms)
      },
      onPointerMove: (e: PointerEvent) => {
        if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) cancel()
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      // Android löst bei langem Drücken zusätzlich das Kontextmenü aus, am Rechner der Rechtsklick
      onContextMenu: (e: MouseEvent) => {
        e.preventDefault()
        fire()
      },
    },
    /** Der Klick nach einem langen Drücken soll nicht zusätzlich abhaken */
    consumed: () => {
      const was = fired.current
      fired.current = false
      return was
    },
  }
}

function ProductRow({
  product,
  listed,
  onToggle,
  onLongPress,
  onDelete,
}: {
  product: Product
  listed: boolean
  onToggle: () => void
  onLongPress: () => void
  onDelete: () => void
}) {
  const press = useLongPress(onLongPress)
  return (
    <li className="flex items-center border-b border-line/70 pr-2 last:border-0">
      <button
        type="button"
        {...press.handlers}
        onClick={() => !press.consumed() && onToggle()}
        aria-pressed={listed}
        className="flex min-h-12 min-w-0 flex-1 touch-manipulation items-center gap-3 py-2 pl-4 text-left select-none [-webkit-touch-callout:none]"
      >
        <CheckCircle checked={listed} small />
        <span className="truncate text-[15px]">{product.name}</span>
      </button>
      <IconButton label={`${product.name} aus den Produkten löschen`} tone="danger" onClick={onDelete}>
        <Trash2 size={17} />
      </IconButton>
    </li>
  )
}

/** Popup zum Ändern der Kategorie eines Produkts. */
function CategorySheet({ product, onClose }: { product: Product; onClose: () => void }) {
  // Das Loslassen nach dem langen Drücken darf nicht schon eine Kategorie wählen
  const [openedAt] = useState(Date.now)
  const pick = async (category: CategoryId) => {
    if (Date.now() - openedAt < 400) return
    if (category !== product.category) {
      await setProductCategory(product, category)
      toast(`„${product.name}“ jetzt unter ${CATEGORIES.find((c) => c.id === category)?.label}`)
    }
    onClose()
  }
  return (
    <Sheet open onClose={onClose} title={product.name}>
      <div className="pt-1 pb-2">
        <p className="mb-3 text-sm text-muted">In welcher Kategorie soll das Produkt stehen?</p>
        <ul className="space-y-1">
          {CATEGORIES.map((c) => {
            const active = c.id === product.category
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => pick(c.id)}
                  aria-pressed={active}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-full px-4 text-left text-[15px] transition ${active ? 'bg-brand-soft font-medium' : 'hover:bg-bg'}`}
                >
                  <c.icon size={18} className={active ? 'text-brand' : 'text-muted'} />
                  <span className="flex-1">{c.label}</span>
                  {active && <Check size={18} className="text-brand" />}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </Sheet>
  )
}
