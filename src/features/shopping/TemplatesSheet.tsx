import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Download, Pencil, Plus } from 'lucide-react'
import { addToList, db, type Ingredient, type Template, newId } from '../../lib/db'
import { Button, Field, IconButton, Sheet, inputClass } from '../../components/ui'
import { confirmDialog } from '../../components/Confirm'
import { IngredientEditor } from '../../components/IngredientEditor'
import { toast } from '../../components/Toast'

type Draft = { id?: string; name: string; items: Ingredient[] }

/** Gespeicherte Listen verwalten und laden – öffnet sich aus der Einkaufsliste. */
export function TemplatesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const templates = useLiveQuery(() => db.templates.orderBy('name').toArray(), [])
  const [editing, setEditing] = useState<Draft | null>(null)

  if (!open) return null
  if (editing) return <TemplateEditor draft={editing} onClose={() => setEditing(null)} />

  const load = async (t: Template) => {
    await addToList(t.items)
    toast(`„${t.name}“ geladen · ${t.items.length} Produkte`)
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title="Gespeicherte Listen">
      <div className="space-y-3 pt-1 pb-2">
        <Button variant="secondary" className="w-full" onClick={() => setEditing({ name: '', items: [] })}>
          <Plus size={18} /> Neue Liste
        </Button>

        {templates?.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">
            Noch keine Listen. Speichere deine aktuelle Einkaufsliste über das ⋯-Menü oder lege hier eine an, z. B. „Wocheneinkauf“.
          </p>
        )}

        <ul className="space-y-2">
          {templates?.map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-3xl bg-bg p-3 pl-4">
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">{t.name}</h3>
                <p className="truncate text-sm text-muted">
                  {t.items.length} Produkte · {t.items.map((i) => i.name).join(', ')}
                </p>
              </div>
              <IconButton label={`${t.name} bearbeiten`} tone="danger" onClick={() => setEditing({ ...t })}>
                <Pencil size={17} />
              </IconButton>
              <Button variant="secondary" onClick={() => load(t)} disabled={t.items.length === 0}>
                <Download size={18} /> Laden
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  )
}

function TemplateEditor({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const [d, setD] = useState(draft)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!d.name.trim()) return
    const data = { name: d.name.trim(), items: d.items.filter((i) => i.name.trim()) }
    if (d.id) await db.templates.update(d.id, data)
    else await db.templates.add({ ...data, id: newId(), createdAt: Date.now() } as Template)
    onClose()
  }

  const remove = async () => {
    if (d.id && await confirmDialog(`Liste „${d.name}“ löschen?`)) {
      await db.templates.delete(d.id)
      onClose()
    }
  }

  return (
    <Sheet open onClose={onClose} title={d.id ? 'Liste bearbeiten' : 'Neue Liste'}>
      <form onSubmit={save} className="space-y-5 pt-1 pb-2">
        <Field label="Name">
          <input autoFocus={!d.id} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="z. B. Wocheneinkauf" className={inputClass} />
        </Field>
        <div>
          <span className="mb-1.5 block text-sm font-semibold">Produkte</span>
          <IngredientEditor value={d.items} onChange={(items) => setD({ ...d, items })} />
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
