import { useMemo, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, Plus, CircleCheck } from 'lucide-react'
import { SymbolIcon } from '../../components/icons'
import { db, type Level, type Todo, newId } from '../../lib/db'
import { endOfWeek, formatDate, relativeDate, startOfWeek } from '../../lib/dates'
import { Button, CheckCircle, Chips, EmptyState, Field, SectionTitle, Sheet, inputClass } from '../../components/ui'
import { GROUPS, GROUP_LABELS, HORIZONS, groupOf, horizonOf, type GroupId } from './horizons'
import { CategoryPicker, createCategory, extractHashtag, findCategory, useCategories } from './categories'
import { LEVEL_POINTS, levelInfo, nextLevel, pointsLabel, usePointsSettings, weekStats } from './points'
import { LevelDots, LevelPicker, ReviewCard, WeekProgress } from './PointsUI'
import { toast } from '../../components/Toast'

export const toggleTodo = (t: Todo) => db.todos.update(t.id, { done: !t.done, doneAt: t.done ? undefined : Date.now() })

export function Todos({ onReport }: { onReport: (week: string) => void }) {
  const all = useLiveQuery(() => db.todos.toArray(), [])
  // Archivierte (erledigt und entfernt) bleiben nur für die Punkte-Rückblicke erhalten.
  const todos = useMemo(() => all?.filter((t) => !t.archived), [all])
  const cats = useCategories()
  const points = usePointsSettings()
  const week = useMemo(() => (points.enabled && all ? weekStats(all, cats, startOfWeek()) : undefined), [points.enabled, all, cats])
  // null = zu, Todo ohne id = neues To-do
  const [editing, setEditing] = useState<Draft | null>(null)
  const [showDone, setShowDone] = useState(false)

  const { groups, done } = useMemo(() => {
    const open = (todos ?? []).filter((t) => !t.done).sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.createdAt - b.createdAt)
    const groups = GROUPS.map((id) => ({ id, items: open.filter((t) => groupOf(t.due) === id) })).filter((g) => g.items.length > 0)
    const done = (todos ?? []).filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
    return { groups, done }
  }, [todos])

  if (!todos) return null

  return (
    <>
      <div className="px-5 pt-2">
        <Button variant="secondary" className="w-full" onClick={() => setEditing({ title: '', due: endOfWeek() })}>
          <Plus size={18} /> Neues To-do
        </Button>
      </div>

      {points.enabled && week && (
        <div className="mt-2 space-y-1 px-5">
          <ReviewCard onOpen={onReport} />
          <WeekProgress points={week.total} goal={points.weeklyGoal} label="diese Woche" onClick={() => onReport(week.start)} />
        </div>
      )}

      {todos.length === 0 ? (
        <EmptyState icon={CircleCheck} title="Nichts zu tun?" text="Lege ein To-do an und wähle, bis wann es erledigt sein soll." />
      ) : (
        <div className="mt-4 space-y-5 px-5">
          {groups.length === 0 && (
            <div className="rounded-3xl bg-brand-soft px-5 py-6 text-center">
              <CircleCheck size={28} strokeWidth={1.75} className="mx-auto text-brand" />
              <p className="mt-2 font-serif text-xl font-[600] text-ink">Alles erledigt</p>
            </div>
          )}

          {groups.map((g) => (
            <section key={g.id}>
              <SectionTitle>
                <span className={g.id === 'überfällig' ? 'text-warn' : ''}>{GROUP_LABELS[g.id]}</span>
                <span className="font-normal">· {g.items.length}</span>
              </SectionTitle>
              <ul className="overflow-hidden rounded-3xl bg-surface">
                {g.items.map((t) => (
                  <TodoRow key={t.id} todo={t} group={g.id} onEdit={() => setEditing(t)} />
                ))}
              </ul>
            </section>
          ))}

          {done.length > 0 && (
            <section>
              <SectionTitle
                action={
                  showDone && (
                    <button
                      type="button"
                      onClick={() => db.todos.bulkUpdate(done.map((t) => ({ key: t.id, changes: { archived: true } })))}
                      className="h-10 px-1 text-sm font-semibold text-brand"
                    >
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
                    <TodoRow key={t.id} todo={t} onEdit={() => setEditing(t)} />
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

function TodoRow({ todo, group, onEdit }: { todo: Todo; group?: GroupId; onEdit: () => void }) {
  const cats = useCategories()
  // Nur das Symbol der Kategorie, dezent vor dem Titel – keine Plakette.
  const catEmoji = findCategory(cats, todo.category)?.emoji
  const points = usePointsSettings().enabled
  const level = todo.level
  const overdue = group === 'überfällig'
  // In der Gruppe „Heute“ ist das Datum überflüssig, sonst „bis Sonntag“ bzw. „seit 3. Nov.“
  const label = !todo.due || group === 'heute' || todo.done ? undefined : overdue ? `seit ${formatDate(todo.due)}` : `bis ${relativeDate(todo.due)}`

  return (
    <li className="flex items-center border-b border-line/70 pr-4 last:border-0">
      <button
        type="button"
        aria-label={todo.done ? 'Als offen markieren' : 'Erledigt'}
        onClick={() => {
          toggleTodo(todo)
          if (points && level && !todo.done) toast(`+ ${pointsLabel(LEVEL_POINTS[level])}`)
        }}
        className="grid min-h-14 w-14 shrink-0 place-items-center"
      >
        <CheckCircle checked={todo.done} />
      </button>
      <button type="button" onClick={onEdit} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 text-left">
        <span className={`min-w-0 flex-1 text-[15px] ${todo.done ? 'text-muted line-through' : 'font-medium'}`}>
          {catEmoji && <SymbolIcon value={catEmoji} size={15} className="mr-1.5 -mt-0.5 inline-block text-muted" />}
          {todo.title}
        </span>
        {label && (
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${overdue ? 'bg-warn-soft text-warn' : 'bg-bg text-muted'}`}>{label}</span>
        )}
        {points && level && todo.done && <span className="shrink-0 text-xs font-medium text-muted">+{LEVEL_POINTS[level]}</span>}
      </button>
      {points && level && !todo.done && (
        <button
          type="button"
          aria-label={`Stufe ${levelInfo(level).label} (${pointsLabel(LEVEL_POINTS[level])}) – antippen zum Ändern`}
          title={`${levelInfo(level).label} · ${pointsLabel(LEVEL_POINTS[level])}`}
          onClick={() => db.todos.update(todo.id, { level: nextLevel(level) })}
          className="-mr-2 ml-1 grid size-10 shrink-0 place-items-center rounded-full transition active:scale-90"
        >
          <LevelDots level={level} />
        </button>
      )}
    </li>
  )
}

type Draft = Partial<Todo> & { title: string }

function TodoEditor({ todo, onClose }: { todo: Draft; onClose: () => void }) {
  const [title, setTitle] = useState(todo.title)
  const [due, setDue] = useState(todo.due)
  const [category, setCategory] = useState(todo.category)
  const [level, setLevel] = useState<Level | undefined>(todo.level)
  const points = usePointsSettings().enabled

  const save = async (e: FormEvent) => {
    e.preventDefault()
    // „#Masterprojekt“ im Titel legt die Kategorie bei Bedarf an
    const { title: clean, category: hashtag } = extractHashtag(title)
    if (!clean) return
    const cat = (hashtag && (await createCategory(hashtag))) || category
    const data = { title: clean, due, category: cat, level: points ? level : todo.level }
    if (todo.id) await db.todos.update(todo.id, data)
    else await db.todos.add({ ...data, id: newId(), done: false, createdAt: Date.now() } as Todo)
    onClose()
  }

  const remove = async () => {
    if (todo.id) await db.todos.delete(todo.id)
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={todo.id ? 'To-do bearbeiten' : 'Neues To-do'}>
      <form onSubmit={save} className="space-y-5 pt-1 pb-2">
        <Field label="Was ist zu tun?">
          <input autoFocus={!todo.id} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Steuererklärung abschicken" className={inputClass} />
        </Field>

        <div className="space-y-2">
          <span className="block text-sm font-semibold">Zeitraum</span>
          <Chips value={horizonOf(due)} options={HORIZONS} onChange={(id) => setDue(HORIZONS.find((h) => h.id === id)!.due())} />
          <input type="date" aria-label="Eigenes Datum" value={due ?? ''} onChange={(e) => setDue(e.target.value || undefined)} className={inputClass} />
          <p className="text-xs text-muted">{due ? `Fällig: ${relativeDate(due)}` : 'Ohne Termin – oder eigenes Datum wählen'}</p>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-semibold">Kategorie</span>
          <CategoryPicker value={category} onChange={(id) => setCategory(id)} />
        </div>

        {points && (
          <div className="space-y-2">
            <span className="block text-sm font-semibold">Punkte</span>
            <LevelPicker value={level} onChange={setLevel} />
            <p className="text-xs text-muted">{level ? pointsLabel(LEVEL_POINTS[level]) : 'Keine Punkte für dieses To-do'}</p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {todo.id && (
            <Button variant="ghost" onClick={remove} className="text-warn">
              Löschen
            </Button>
          )}
          <Button type="submit" disabled={!title.trim()} className="flex-1">
            {todo.id ? 'Speichern' : 'Hinzufügen'}
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
