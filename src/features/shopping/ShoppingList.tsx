import { useMemo, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, Bookmark, MoreHorizontal, Plus, Trash2, BookmarkPlus, ListX, Eraser, ShoppingBasket, CircleCheck, ListPlus, Rows3, type LucideIcon } from 'lucide-react'
import { SymbolIcon } from '../../components/icons'
import { addToList, clearChecked, clearList, db, deleteItem, saveListAsTemplate, toggleItem, type ListItem, type Product, type Recipe } from '../../lib/db'
import { likelyTypo } from '../../lib/products'
import { CATEGORIES } from '../../lib/categories'
import { parseEntry } from '../../lib/parse'
import { Button, CheckCircle, EmptyState, IconButton, MenuItem, PageHeader, Sheet, Switch, inputClass } from '../../components/ui'
import { toast } from '../../components/Toast'
import { confirmDialog } from '../../components/Confirm'
import { RecipesSheet } from './RecipesSheet'
import { TemplatesSheet } from './TemplatesSheet'
import { ProductsSheet } from './ProductsSheet'
import { ProductSuggestions } from './ProductSuggestions'

// Darstellung der Liste: nach Kategorien gruppiert (Überschriften) oder kompakt (eine Liste, Kategorie als Icon).
// Bewusst nur lokal im Gerät gespeichert – bleibt über Neustart und Abmelden hinweg erhalten.
type ListView = 'grouped' | 'compact'
const VIEW_KEY = 'shopping:view'
function readView(): ListView {
  try {
    return localStorage.getItem(VIEW_KEY) === 'compact' ? 'compact' : 'grouped'
  } catch {
    return 'grouped'
  }
}

export default function ShoppingList() {
  const items = useLiveQuery(() => db.listItems.toArray(), [])
  const recipes = useLiveQuery(() => db.recipes.orderBy('name').toArray(), [])
  const [text, setText] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [recipesOpen, setRecipesOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [productsOpen, setProductsOpen] = useState(false)
  const [view, setView] = useState<ListView>(readView)
  const compact = view === 'compact'
  const toggleView = () => {
    const next: ListView = compact ? 'grouped' : 'compact'
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {}
  }
  // Rückfrage „Meintest du …?“, wenn ein neues Produkt einem bekannten sehr ähnlich ist
  const [typo, setTypo] = useState<{ entry: { name: string; quantity: string }; suggestion: Product } | null>(null)

  const open = useMemo(() => (items ?? []).filter((i) => !i.checked), [items])
  const done = useMemo(() => (items ?? []).filter((i) => i.checked).sort((a, b) => a.name.localeCompare(b.name)), [items])
  const groups = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        ...c,
        items: open.filter((i) => i.category === c.id).sort((a, b) => a.name.localeCompare(b.name)),
      })).filter((g) => g.items.length > 0),
    [open],
  )

  if (!items) return null
  const total = items.length

  const add = async (entry: { name: string; quantity: string; category?: Product['category'] }) => {
    await addToList([entry])
    setText('')
    setTypo(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    const entry = parseEntry(text)
    const suggestion = likelyTypo(await db.products.toArray(), entry.name)
    if (suggestion) setTypo({ entry, suggestion })
    else await add(entry)
  }

  const addRecipe = async (r: Recipe) => {
    await addToList(r.ingredients)
    toast(`${r.ingredients.length} Zutaten aus „${r.name}“ hinzugefügt`)
  }

  return (
    <>
      <PageHeader
        title={<>Was <em>fehlt</em>?</>}
        subtitle={total === 0 ? 'Was brauchst du?' : `${done.length} von ${total} im Wagen`}
        action={
          <div className="flex gap-2">
            <IconButton label="Rezepte" onClick={() => setRecipesOpen(true)}>
              <BookOpen size={19} />
            </IconButton>
            <IconButton label="Gespeicherte Listen" onClick={() => setTemplatesOpen(true)}>
              <Bookmark size={19} />
            </IconButton>
            <IconButton label="Mehr" onClick={() => setMenuOpen(true)}>
              <MoreHorizontal size={20} />
            </IconButton>
          </div>
        }
      />

      {total > 0 && (
        <div className="mx-5 mb-4 h-1.5 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${(done.length / total) * 100}%` }} />
        </div>
      )}

      <form onSubmit={submit} className="sticky top-0 z-30 bg-bg/90 px-5 py-2.5 backdrop-blur-lg">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setTypo(null)
            }}
            placeholder="z. B. 2 Avocados oder Milch"
            enterKeyHint="done"
            autoComplete="off"
            className={inputClass}
          />
          <button
            type="submit"
            aria-label="Hinzufügen"
            disabled={!text.trim()}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-surface transition active:scale-95 disabled:opacity-40"
          >
            <Plus size={22} />
          </button>
        </div>
        <div className="mt-2 empty:hidden">
          {typo ? (
            <div className="flex flex-wrap items-center gap-2 rounded-3xl bg-surface px-4 py-3 text-sm">
              <span className="w-full text-muted">„{typo.entry.name}“ ist neu. Meintest du:</span>
              <button
                type="button"
                onClick={() => add({ ...typo.entry, name: typo.suggestion.name, category: typo.suggestion.category })}
                className="h-10 rounded-full bg-brand px-4 font-medium text-surface transition active:scale-95"
              >
                {typo.suggestion.name}
              </button>
              <button type="button" onClick={() => add(typo.entry)} className="h-10 rounded-full px-3 font-medium text-ink/80 transition hover:bg-bg">
                „{typo.entry.name}“ hinzufügen
              </button>
            </div>
          ) : text.trim() ? (
            <ProductSuggestions query={text} onPick={(p, quantity) => add({ name: p.name, quantity, category: p.category })} />
          ) : (
            <button type="button" onClick={() => setProductsOpen(true)} className="-ml-1 flex h-10 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-muted transition hover:text-ink">
              <ListPlus size={16} /> Aus Produkten wählen
            </button>
          )}
        </div>
      </form>

      {recipes && recipes.length > 0 && (
        <div className="mt-2">
          <p className="px-5 pb-2 text-xs font-medium tracking-wider text-muted uppercase">Rezept hinzufügen</p>
          <div className="flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
            {recipes.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => addRecipe(r)}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium transition active:scale-95"
              >
                <SymbolIcon value={r.emoji} size={16} className="text-brand" />
                {r.name}
                <Plus size={14} className="text-brand" />
              </button>
            ))}
          </div>
        </div>
      )}

      {total === 0 ? (
        <EmptyState icon={ShoppingBasket} title="Deine Liste ist leer" text="Füge oben Produkte hinzu, tippe auf ein Rezept oder lade eine gespeicherte Liste." />
      ) : (
        <div className="mt-5 space-y-5 px-5">
          {open.length === 0 && (
            <div className="rounded-3xl bg-brand-soft px-5 py-6 text-center">
              <CircleCheck size={28} strokeWidth={1.75} className="mx-auto text-brand" />
              <p className="mt-2 font-serif text-xl font-[600] text-ink">Alles erledigt</p>
            </div>
          )}

          {compact && groups.length > 0 && (
            // Kompakt: gleiche Sortierung wie gruppiert (Supermarkt-Reihenfolge), aber ohne Überschriften
            <ul className="overflow-hidden rounded-3xl bg-surface">
              {groups.flatMap((g) => g.items.map((i) => <Row key={i.id} item={i} icon={g.icon} />))}
            </ul>
          )}

          {!compact && groups.map((g) => (
            <section key={g.id}>
              <h2 className="mb-2.5 flex items-center gap-2 font-serif text-[17px] leading-[1.1] font-[600]">
                <g.icon size={17} className="text-brand" />
                {g.label}
              </h2>
              <ul className="overflow-hidden rounded-3xl bg-surface">
                {g.items.map((i) => (
                  <Row key={i.id} item={i} />
                ))}
              </ul>
            </section>
          ))}

          {done.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-serif text-[17px] leading-[1.1] font-[600] text-muted">Im Wagen · {done.length}</h2>
                <button type="button" onClick={() => clearChecked()} className="text-sm font-semibold text-brand">
                  Entfernen
                </button>
              </div>
              <ul className="overflow-hidden rounded-3xl bg-surface/60">
                {done.map((i) => (
                  <Row key={i.id} item={i} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Liste">
        <div className="space-y-1 pb-2">
          <button
            type="button"
            role="switch"
            aria-checked={compact}
            onClick={toggleView}
            className="flex w-full items-center gap-3 rounded-full px-4 py-3.5 text-left text-[15px] font-medium transition hover:bg-bg"
          >
            <Rows3 size={20} className="shrink-0 text-brand" />
            <span className="flex-1">
              Kompakte Ansicht
              <span className="block text-xs font-normal text-muted">Ohne Überschriften, Kategorie als Icon</span>
            </span>
            <Switch on={compact} />
          </button>
          <MenuItem
            icon={<BookmarkPlus size={20} />}
            label="Als Liste speichern"
            disabled={total === 0}
            onClick={() => {
              setMenuOpen(false)
              setSaveOpen(true)
            }}
          />
          <MenuItem
            icon={<Eraser size={20} />}
            label="Abgehakte entfernen"
            disabled={done.length === 0}
            onClick={() => {
              clearChecked()
              setMenuOpen(false)
            }}
          />
          <MenuItem
            icon={<ListX size={20} />}
            label="Liste komplett leeren"
            danger
            disabled={total === 0}
            onClick={async () => {
              setMenuOpen(false)
              if (await confirmDialog('Wirklich alle Einträge der Einkaufsliste löschen?', 'Leeren')) clearList()
            }}
          />
        </div>
      </Sheet>

      <SaveSheet open={saveOpen} onClose={() => setSaveOpen(false)} />
      <RecipesSheet open={recipesOpen} onClose={() => setRecipesOpen(false)} />
      <TemplatesSheet open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
      <ProductsSheet open={productsOpen} onClose={() => setProductsOpen(false)} />
    </>
  )
}

/** Eintrag der Liste; mit `icon` (kompakte Ansicht) steht die Kategorie als kleines Icon vor dem Namen. */
function Row({ item, icon: Icon }: { item: ListItem; icon?: LucideIcon }) {
  return (
    <li className="group flex items-center gap-3 border-b border-line/70 pr-2 pl-4 last:border-0">
      <button type="button" onClick={() => toggleItem(item)} className={`flex flex-1 items-center gap-3 py-2 text-left ${Icon ? 'min-h-12' : 'min-h-14'}`}>
        <CheckCircle checked={item.checked} />
        {Icon && <Icon size={16} className="shrink-0 text-brand" aria-hidden />}
        <span className={`flex-1 text-[15px] transition ${item.checked ? 'text-muted line-through' : 'font-medium'}`}>{item.name}</span>
        {item.quantity && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${item.checked ? 'text-muted' : 'bg-bg text-ink/80'}`}>
            {item.quantity}
          </span>
        )}
      </button>
      <IconButton label={`${item.name} löschen`} onClick={() => deleteItem(item.id)} tone="danger">
        <Trash2 size={17} />
      </IconButton>
    </li>
  )
}

function SaveSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await saveListAsTemplate(name)
    toast(`Liste „${name.trim()}“ gespeichert`)
    setName('')
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Liste speichern">
      <form onSubmit={submit} className="space-y-4 pt-1 pb-2">
        <p className="text-sm text-muted">Speichere die aktuelle Liste, um sie später mit einem Tipp wieder zu laden.</p>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Wocheneinkauf" className={inputClass} />
        <Button type="submit" disabled={!name.trim()} className="w-full">
          Speichern
        </Button>
      </form>
    </Sheet>
  )
}
