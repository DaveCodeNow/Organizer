import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, Bookmark, MoreHorizontal, Plus, Trash2, BookmarkPlus, ListX, Eraser } from 'lucide-react'
import { addToList, clearChecked, clearList, db, deleteItem, saveListAsTemplate, toggleItem, type ListItem, type Recipe } from '../../lib/db'
import { CATEGORIES } from '../../lib/categories'
import { parseEntry } from '../../lib/parse'
import { Button, CheckCircle, EmptyState, IconButton, PageHeader, Sheet, inputClass } from '../../components/ui'
import { toast } from '../../components/Toast'
import { RecipesSheet } from './RecipesSheet'
import { TemplatesSheet } from './TemplatesSheet'

export default function ShoppingList() {
  const items = useLiveQuery(() => db.listItems.toArray(), [])
  const recipes = useLiveQuery(() => db.recipes.orderBy('name').toArray(), [])
  const [text, setText] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [recipesOpen, setRecipesOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)

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

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    await addToList([parseEntry(text)])
    setText('')
  }

  const addRecipe = async (r: Recipe) => {
    await addToList(r.ingredients)
    toast(`${r.emoji} ${r.ingredients.length} Zutaten aus „${r.name}“ hinzugefügt`)
  }

  return (
    <>
      <PageHeader
        title="Einkauf"
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

      <form onSubmit={submit} className="sticky top-0 z-30 bg-bg/90 px-5 py-2 backdrop-blur-lg">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="z. B. 2 Avocados oder Milch"
            enterKeyHint="done"
            autoComplete="off"
            className={inputClass}
          />
          <button
            type="submit"
            aria-label="Hinzufügen"
            disabled={!text.trim()}
            className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-card transition active:scale-95 disabled:opacity-40"
          >
            <Plus size={22} />
          </button>
        </div>
      </form>

      {recipes && recipes.length > 0 && (
        <div className="mt-2">
          <p className="px-5 pb-2 text-xs font-semibold tracking-wide text-muted uppercase">Rezept hinzufügen</p>
          <div className="flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
            {recipes.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => addRecipe(r)}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium shadow-card transition active:scale-95"
              >
                <span>{r.emoji}</span>
                {r.name}
                <Plus size={14} className="text-brand" />
              </button>
            ))}
          </div>
        </div>
      )}

      {total === 0 ? (
        <EmptyState emoji="🛒" title="Deine Liste ist leer" text="Füge oben Produkte hinzu, tippe auf ein Rezept oder lade eine gespeicherte Liste." />
      ) : (
        <div className="mt-5 space-y-5 px-5">
          {open.length === 0 && (
            <div className="rounded-3xl bg-brand-soft px-5 py-6 text-center">
              <div className="text-3xl">🎉</div>
              <p className="mt-1 font-semibold text-brand-ink">Alles erledigt!</p>
            </div>
          )}

          {groups.map((g) => (
            <section key={g.id}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted">
                <span>{g.emoji}</span>
                {g.label}
              </h2>
              <ul className="overflow-hidden rounded-3xl bg-surface shadow-card">
                {g.items.map((i) => (
                  <Row key={i.id} item={i} />
                ))}
              </ul>
            </section>
          ))}

          {done.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted">Im Wagen · {done.length}</h2>
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
            onClick={() => {
              if (confirm('Wirklich alle Einträge löschen?')) clearList()
              setMenuOpen(false)
            }}
          />
        </div>
      </Sheet>

      <SaveSheet open={saveOpen} onClose={() => setSaveOpen(false)} />
      <RecipesSheet open={recipesOpen} onClose={() => setRecipesOpen(false)} />
      <TemplatesSheet open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
    </>
  )
}

function Row({ item }: { item: ListItem }) {
  return (
    <li className="group flex items-center gap-3 border-b border-line/70 pr-2 pl-4 last:border-0">
      <button type="button" onClick={() => toggleItem(item)} className="flex min-h-14 flex-1 items-center gap-3 py-2 text-left">
        <CheckCircle checked={item.checked} />
        <span className={`flex-1 text-[15px] transition ${item.checked ? 'text-muted line-through' : 'font-medium'}`}>{item.name}</span>
        {item.quantity && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${item.checked ? 'text-muted' : 'bg-bg text-muted'}`}>
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

function MenuItem({ icon, label, onClick, danger, disabled }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left text-[15px] font-medium transition hover:bg-bg disabled:opacity-35 ${
        danger ? 'text-red-600' : ''
      }`}
    >
      {icon}
      {label}
    </button>
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
