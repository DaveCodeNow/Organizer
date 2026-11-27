import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Download, Pencil, Plus } from 'lucide-react'
import { addToList, db, type Ingredient, type Template } from '../../lib/db'
import { Button, EmptyState, IconButton, PageHeader, Sheet, inputClass } from '../../components/ui'
import { IngredientEditor } from '../../components/IngredientEditor'
import { toast } from '../../components/Toast'

type Draft = { id?: number; name: string; items: Ingredient[] }

export default function Templates() {
  const templates = useLiveQuery(() => db.templates.orderBy('name').toArray(), [])
  const [editing, setEditing] = useState<Draft | null>(null)

  const load = async (t: Template) => {
    await addToList(t.items)
    toast(`„${t.name}“ geladen · ${t.items.length} Produkte`)
  }

  if (!templates) return null

  return (
    <>
      <PageHeader
        title="Gespeicherte Listen"
        subtitle="Komplette Einkäufe mit einem Tipp laden"
        action={
          <IconButton label="Neue Liste" tone="brand" onClick={() => setEditing({ name: '', items: [] })}>
            <Plus size={22} />
          </IconButton>
        }
      />

      {templates.length === 0 ? (
        <EmptyState
          emoji="🔖"
          title="Noch keine Listen gespeichert"
          text="Speichere deine Einkaufsliste über das ⋯-Menü oder lege hier eine neue an – z. B. „Wocheneinkauf“."
        >
          <Button onClick={() => setEditing({ name: '', items: [] })}>
            <Plus size={18} /> Liste anlegen
          </Button>
        </EmptyState>
      ) : (
        <ul className="space-y-3 px-5">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-3xl bg-surface p-4 shadow-card">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[17px] font-semibold">{t.name}</h3>
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
      )}

      {editing && <TemplateEditor draft={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function TemplateEditor({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const [d, setD] = useState(draft)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!d.name.trim()) return
    const data = { name: d.name.trim(), items: d.items.filter((i) => i.name.trim()) }
    if (d.id) await db.templates.update(d.id, data)
    else await db.templates.add({ ...data, createdAt: Date.now() } as Template)
    onClose()
  }

  const remove = async () => {
    if (d.id && confirm(`Liste „${d.name}“ löschen?`)) {
      await db.templates.delete(d.id)
      onClose()
    }
  }

  return (
    <Sheet open onClose={onClose} title={d.id ? 'Liste bearbeiten' : 'Neue Liste'}>
      <form onSubmit={save} className="space-y-5 pt-1 pb-2">
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Name</label>
          <input autoFocus={!d.id} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="z. B. Wocheneinkauf" className={inputClass} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Produkte</label>
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
