import { useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { IconButton, Sheet, inputClass } from '../../components/ui'
import { confirmDialog } from '../../components/Confirm'
import { EmojiGrid, createCategory, deleteCategory, updateCategory, useCategories, type CategoryInfo } from './categories'

/** Kategorien anlegen, Symbol zuordnen, umbenennen, löschen. */
export function CategoryManager({ onClose }: { onClose: () => void }) {
  const cats = useCategories()
  const [picking, setPicking] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState<string | undefined>()

  const create = async (e: FormEvent) => {
    e.preventDefault()
    if (!(await createCategory(newName, newEmoji))) return
    setNewName('')
    setNewEmoji(undefined)
    setPicking(null)
  }

  return (
    <Sheet open onClose={onClose} title="Kategorien">
      <div className="space-y-5 pt-1 pb-2">
        <p className="text-sm text-muted">Ordne deine To-dos, Ziele und Habits Kategorien zu, z. B. „🎓 Masterprojekt“ oder „🎵 Musik“. Die Ziele werden danach gruppiert.</p>

        {cats.length > 0 && (
          <ul className="space-y-2">
            {cats.map((c) => (
              <CategoryRow key={c.id} cat={c} picking={picking === c.id} onTogglePick={() => setPicking(picking === c.id ? null : c.id)} onPicked={() => setPicking(null)} />
            ))}
          </ul>
        )}

        <form onSubmit={create} className="space-y-2 rounded-3xl bg-bg p-3">
          <span className="block text-sm font-semibold">Neue Kategorie</span>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Symbol wählen"
              onClick={() => setPicking(picking === '' ? null : '')}
              className={`grid size-11 shrink-0 place-items-center rounded-2xl bg-surface text-xl shadow-card ${picking === '' ? 'ring-2 ring-brand' : ''}`}
            >
              {newEmoji ?? <span className="text-sm text-muted">☺︎</span>}
            </button>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="z. B. Masterprojekt" className={`${inputClass} min-w-0 flex-1`} />
            <button
              type="submit"
              aria-label="Kategorie anlegen"
              disabled={!newName.trim()}
              className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand text-white transition active:scale-95 disabled:opacity-40"
            >
              <Plus size={20} />
            </button>
          </div>
          {picking === '' && (
            <EmojiGrid
              value={newEmoji}
              allowNone
              onPick={(e) => {
                setNewEmoji(e)
                setPicking(null)
              }}
            />
          )}
        </form>
      </div>
    </Sheet>
  )
}

function CategoryRow({ cat, picking, onTogglePick, onPicked }: { cat: CategoryInfo; picking: boolean; onTogglePick: () => void; onPicked: () => void }) {
  const [name, setName] = useState(cat.name)

  const commit = () => {
    if (!name.trim()) return setName(cat.name)
    if (name.trim() !== cat.name) updateCategory(cat.id, { name })
  }

  const remove = async () => {
    const msg = cat.count
      ? `Kategorie „${cat.name}“ löschen? ${cat.count} ${cat.count === 1 ? 'Eintrag ist' : 'Einträge sind'} danach ohne Kategorie – die Einträge selbst bleiben erhalten.`
      : `Kategorie „${cat.name}“ löschen?`
    if (await confirmDialog(msg)) await deleteCategory(cat.id)
  }

  return (
    <li className="space-y-2 rounded-3xl bg-bg p-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Symbol für ${cat.name} wählen`}
          onClick={onTogglePick}
          className={`grid size-11 shrink-0 place-items-center rounded-2xl bg-surface text-xl shadow-card ${picking ? 'ring-2 ring-brand' : ''}`}
        >
          {cat.emoji ?? <span className="text-sm text-muted">☺︎</span>}
        </button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          aria-label="Name der Kategorie"
          className={`${inputClass} min-w-0 flex-1`}
        />
        <span className="w-8 shrink-0 text-center text-xs text-muted" title="Anzahl To-dos, Ziele und Habits">
          {cat.count}×
        </span>
        <IconButton label={`${cat.name} löschen`} tone="danger" onClick={remove}>
          <Trash2 size={17} />
        </IconButton>
      </div>
      {picking && (
        <div className="px-1 pb-1">
          <EmojiGrid
            value={cat.emoji}
            allowNone
            onPick={async (e) => {
              await updateCategory(cat.id, { emoji: e })
              onPicked()
            }}
          />
        </div>
      )}
    </li>
  )
}
