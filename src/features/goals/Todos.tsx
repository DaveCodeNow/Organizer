import { useMemo, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, Hash, Plus } from 'lucide-react'
import { db, type Todo } from '../../lib/db'
import { endOfWeek, formatDate, relativeDate } from '../../lib/dates'
import { Button, CheckCircle, Chips, EmptyState, Field, SectionTitle, Sheet, inputClass } from '../../components/ui'
import { GROUPS, GROUP_LABELS, HORIZONS, groupOf, horizonOf, type GroupId } from './horizons'
import { TagList, TagPicker, extractTags, hasTag, mergeTags, useAllTags } from './tags'

export const toggleTodo = (t: Todo) => db.todos.update(t.id, { done: !t.done, doneAt: t.done ? undefined : Date.now() })

export function Todos({ tag }: { tag: string | null }) {
  const all = useLiveQuery(() => db.todos.toArray(), [])
  const todos = useMemo(() => all?.filter((t) => hasTag(t, tag)), [all, tag])
  const [text, setText] = useState('')
  const [due, setDue] = useState<string | undefined>(() => endOfWeek())
  const [editing, setEditing] = useState<Todo | null>(null)
  const [showDone, setShowDone] = useState(false)
  // Tags für neue To-dos – bleiben ausgewählt, damit man mehrere To-dos fürs selbe Projekt anlegen kann.
  const [newTags, setNewTags] = useState<string[]>([])
  const [tagsOpen, setTagsOpen] = useState(false)
  const allTags = useAllTags()

  const { groups, done } = useMemo(() => {
    const open = (todos ?? []).filter((t) => !t.done).sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.createdAt - b.createdAt)
    const groups = GROUPS.map((id) => ({ id, items: open.filter((t) => groupOf(t.due) === id) })).filter((g) => g.items.length > 0)
    const done = (todos ?? []).filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
    return { groups, done }
  }, [todos])

  if (!todos) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    // „#Masterprojekt“ im Text wird zum Tag; bei aktivem Filter kommt dessen Tag automatisch dazu.
    const { title, tags: hashtags } = extractTags(text, allTags)
    if (!title) return
    const tags = mergeTags(tag ? [tag] : [], newTags, hashtags)
    await db.todos.add({ title, due, done: false, tags: tags.length ? tags : undefined, createdAt: Date.now() } as Todo)
    setText('')
    setTagsOpen(false)
  }

  return (
    <>
      <form onSubmit={submit} className="sticky top-0 z-30 space-y-2 bg-bg/90 px-5 py-2 backdrop-blur-lg">
        <div className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={tag ? `Neues To-do in #${tag}` : 'Neues To-do, z. B. Paper lesen #Master'} enterKeyHint="done" autoComplete="off" className={inputClass} />
          <button
            type="submit"
            aria-label="To-do hinzufügen"
            disabled={!text.trim()}
            className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-card transition active:scale-95 disabled:opacity-40"
          >
            <Plus size={22} />
          </button>
        </div>
        <Chips value={horizonOf(due)} options={HORIZONS} onChange={(id) => setDue(HORIZONS.find((h) => h.id === id)!.due())} />
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTagsOpen(!tagsOpen)}
            aria-expanded={tagsOpen}
            className="-ml-1 flex h-9 items-center gap-1 rounded-full px-2 text-sm font-semibold text-brand"
          >
            <Hash size={15} />
            {tagsOpen ? 'Tags schließen' : newTags.length ? 'Tags ändern' : 'Tag hinzufügen'}
          </button>
          {!tagsOpen && <TagList tags={newTags} hide={tag} />}
        </div>
        {tagsOpen && (
          <div className="rounded-3xl bg-surface p-3 shadow-card">
            <TagPicker value={newTags} onChange={setNewTags} />
          </div>
        )}
      </form>

      {todos.length === 0 ? (
        tag ? (
          <EmptyState emoji="🏷️" title={`Keine To-dos in #${tag}`} text="To-dos, die du jetzt oben anlegst, bekommen diesen Tag automatisch." />
        ) : (
          <EmptyState emoji="✅" title="Nichts zu tun?" text="Trage oben ein To-do ein und wähle, bis wann es erledigt sein soll." />
        )
      ) : (
        <div className="mt-4 space-y-5 px-5">
          {groups.length === 0 && (
            <div className="rounded-3xl bg-brand-soft px-5 py-6 text-center">
              <div className="text-3xl">🎉</div>
              <p className="mt-1 font-semibold text-brand-ink">Alles erledigt!</p>
            </div>
          )}

          {groups.map((g) => (
            <section key={g.id}>
              <SectionTitle>
                <span className={g.id === 'überfällig' ? 'text-warn' : ''}>{GROUP_LABELS[g.id]}</span>
                <span className="font-normal">· {g.items.length}</span>
              </SectionTitle>
              <ul className="overflow-hidden rounded-3xl bg-surface shadow-card">
                {g.items.map((t) => (
                  <TodoRow key={t.id} todo={t} group={g.id} hideTag={tag} onEdit={() => setEditing(t)} />
                ))}
              </ul>
            </section>
          ))}

          {done.length > 0 && (
            <section>
              <SectionTitle
                action={
                  showDone && (
                    <button type="button" onClick={() => db.todos.bulkDelete(done.map((t) => t.id))} className="h-10 px-1 text-sm font-semibold text-brand">
                      Entfernen
                    </button>
                  )
                }
              >
                <button type="button" onClick={() => setShowDone(!showDone)} className="flex h-10 items-center gap-1">
                  Erledigt · {done.length}
                  <ChevronDown size={16} className={`transition ${showDone ? 'rotate-180' : ''}`} />
                </button>
              </SectionTitle>
              {showDone && (
                <ul className="overflow-hidden rounded-3xl bg-surface/60">
                  {done.map((t) => (
                    <TodoRow key={t.id} todo={t} hideTag={tag} onEdit={() => setEditing(t)} />
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}

      {editing && <TodoEditor todo={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function TodoRow({ todo, group, hideTag, onEdit }: { todo: Todo; group?: GroupId; hideTag: string | null; onEdit: () => void }) {
  const overdue = group === 'überfällig'
  // In der Gruppe „Heute“ ist das Datum überflüssig, sonst „bis Sonntag“ bzw. „seit 3. Nov.“
  const label = !todo.due || group === 'heute' || todo.done ? undefined : overdue ? `seit ${formatDate(todo.due)}` : `bis ${relativeDate(todo.due)}`

  return (
    <li className="flex items-center border-b border-line/70 pr-4 last:border-0">
      <button type="button" aria-label={todo.done ? 'Als offen markieren' : 'Erledigt'} onClick={() => toggleTodo(todo)} className="grid min-h-14 w-14 shrink-0 place-items-center">
        <CheckCircle checked={todo.done} />
      </button>
      <button type="button" onClick={onEdit} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 text-left">
        <span className="min-w-0 flex-1">
          <span className={`block text-[15px] ${todo.done ? 'text-muted line-through' : 'font-medium'}`}>{todo.title}</span>
          <TagList tags={todo.tags} hide={hideTag} className="mt-1" />
        </span>
        {label && (
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${overdue ? 'bg-warn-soft text-warn' : 'bg-bg text-muted'}`}>{label}</span>
        )}
      </button>
    </li>
  )
}

function TodoEditor({ todo, onClose }: { todo: Todo; onClose: () => void }) {
  const [title, setTitle] = useState(todo.title)
  const [due, setDue] = useState(todo.due)
  const [tags, setTags] = useState(todo.tags ?? [])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    await db.todos.update(todo.id, { title: title.trim(), due, tags: tags.length ? tags : undefined })
    onClose()
  }

  const remove = async () => {
    await db.todos.delete(todo.id)
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title="To-do bearbeiten">
      <form onSubmit={save} className="space-y-5 pt-1 pb-2">
        <Field label="Was ist zu tun?">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </Field>

        <div className="space-y-2">
          <span className="block text-sm font-semibold">Zeitraum</span>
          <Chips value={horizonOf(due)} options={HORIZONS} onChange={(id) => setDue(HORIZONS.find((h) => h.id === id)!.due())} />
          <input type="date" aria-label="Eigenes Datum" value={due ?? ''} onChange={(e) => setDue(e.target.value || undefined)} className={inputClass} />
          <p className="text-xs text-muted">{due ? `Fällig: ${relativeDate(due)}` : 'Ohne Termin – oder eigenes Datum wählen'}</p>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-semibold">Tags</span>
          <TagPicker value={tags} onChange={setTags} />
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" onClick={remove} className="text-red-600">
            Löschen
          </Button>
          <Button type="submit" disabled={!title.trim()} className="flex-1">
            Speichern
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
