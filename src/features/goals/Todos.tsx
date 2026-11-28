import { useMemo, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, Plus, CircleCheck, Repeat as RepeatIcon, RotateCcw } from 'lucide-react'
import { SymbolIcon } from '../../components/icons'
import { db, type Level, type Repeat, type Todo, newId } from '../../lib/db'
import { formatDate, fromISO, relativeDate, startOfWeek, today } from '../../lib/dates'
import { Button, CheckCircle, Chips, EmptyState, Field, SectionTitle, Sheet, inputClass } from '../../components/ui'
import { GROUPS, GROUP_LABELS, HORIZONS, byTime, groupOf, horizonOf, isFixed, isNow, timeLabel, urgencyOf, type GroupId } from './horizons'
import { CategoryPicker, createCategory, extractHashtag, findCategory, useCategories, type CategoryInfo } from './categories'
import { LEVEL_POINTS, levelInfo, nextLevel, pointsLabel, usePointsSettings, weekStats } from './points'
import { LevelDots, LevelPicker, ReviewCard, WeekProgress } from './PointsUI'
import { toast } from '../../components/Toast'
import { REPEATS, isPlanned, repeatLabel, toggleTodo, visibleFrom } from './repeat'


export function Todos({ onReport, colors }: { onReport: (week: string) => void; colors?: boolean }) {
  const all = useLiveQuery(() => db.todos.toArray(), [])
  // Archivierte (erledigt und entfernt) bleiben nur für die Punkte-Rückblicke erhalten.
  const todos = useMemo(() => all?.filter((t) => !t.archived), [all])
  const cats = useCategories()
  const points = usePointsSettings()
  const week = useMemo(() => (points.enabled && all ? weekStats(all, cats, startOfWeek()) : undefined), [points.enabled, all, cats])
  // null = zu, Todo ohne id = neues To-do
  const [editing, setEditing] = useState<Draft | null>(null)
  const [showDone, setShowDone] = useState(false)
  const [showPlanned, setShowPlanned] = useState(false)

  const { groups, done, planned } = useMemo(() => {
    // Wiederkehrende To-dos mit fernem Termin erst kurz vorher zeigen (z. B. jährliche 4 Wochen vorher)
    const planned = (todos ?? []).filter((t) => isPlanned(t)).sort((a, b) => a.due!.localeCompare(b.due!))
    const open = (todos ?? []).filter((t) => !t.done && !isPlanned(t)).sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || byTime(a, b) || a.createdAt - b.createdAt)
    const groups = GROUPS.map((id) => ({ id, items: open.filter((t) => groupOf(t.due) === id) })).filter((g) => g.items.length > 0)
    const done = (todos ?? []).filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
    return { groups, done, planned }
  }, [todos])

  if (!todos) return null

  return (
    <>
      <div className="px-5 pt-2">
        <Button variant="secondary" className="w-full" onClick={() => setEditing({ title: '', due: today(), fixed: true })}>
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
                {byCategory(g.items, cats).map((b) => [
                  b.cat && (
                    <li key={`cat-${b.cat.id}`} className="flex items-center gap-1.5 px-4 pt-3 pb-1 text-xs font-semibold text-muted">
                      <SymbolIcon value={b.cat.emoji} size={14} className="shrink-0 text-brand" />
                      <span className="truncate">{b.cat.name}</span>
                    </li>
                  ),
                  ...b.items.map((t) => <TodoRow key={t.id} todo={t} group={g.id} colors={colors} hideCategory onEdit={() => setEditing(t)} />),
                ])}
              </ul>
            </section>
          ))}

          {planned.length > 0 && (
            <section>
              <SectionTitle>
                <button type="button" onClick={() => setShowPlanned(!showPlanned)} className="flex h-10 items-center gap-1">
                  Geplant · {planned.length}
                  <ChevronDown size={16} className={`transition ${showPlanned ? 'rotate-180' : ''}`} />
                </button>
              </SectionTitle>
              {showPlanned && (
                <>
                  <ul className="overflow-hidden rounded-3xl bg-surface/60">
                    {planned.map((t) => (
                      <TodoRow key={t.id} todo={t} planned onEdit={() => setEditing(t)} />
                    ))}
                  </ul>
                  <p className="mt-2 px-1 text-xs text-muted">Wiederkehrende To-dos erscheinen erst kurz vor dem Termin in der Liste.</p>
                </>
              )}
            </section>
          )}

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

function TodoRow({
  todo,
  group,
  planned,
  colors,
  hideCategory,
  onEdit,
}: {
  todo: Todo
  group?: GroupId
  planned?: boolean
  colors?: boolean
  /** In den Zeitgruppen steht die Kategorie einmal als Zwischenüberschrift, nicht an jedem To-do */
  hideCategory?: boolean
  onEdit: () => void
}) {
  const cats = useCategories()
  // Sonst (Geplant, Erledigt) nur das Symbol der Kategorie, dezent vor dem Titel – keine Plakette.
  const catEmoji = hideCategory ? undefined : findCategory(cats, todo.category)?.emoji
  const points = usePointsSettings().enabled
  const level = todo.level
  const overdue = group === 'überfällig'
  // In der Gruppe „Heute“ ist das Datum überflüssig (dort nur die Uhrzeit), sonst „Fr · 9:00–11:00“, „bis Sonntag“ bzw. „seit 3. Nov.“
  const time = timeLabel(todo)
  const label = planned && todo.due
    ? `am ${formatDate(todo.due)}`
    : !todo.due || todo.done
      ? undefined
      : overdue
        ? `seit ${formatDate(todo.due)}`
        : group === 'heute'
          ? time
          : isFixed(todo)
            ? [relativeDate(todo.due), time].filter(Boolean).join(' · ')
            : `bis ${relativeDate(todo.due)}`
  // Läuft das Zeitfenster gerade, wird die Uhrzeit dezent hervorgehoben
  const now = group === 'heute' && !todo.done && isNow(todo)
  const title = planned ? `Erscheint ab ${formatDate(visibleFrom(todo))}` : undefined
  // Farbmodus: Fläche hinter dem Abhak-Kreis (bis zwischen Kreis und Text) nach Dringlichkeit.
  // Nur offene To-dos in den Gruppen (erledigte/geplante haben keine `group`).
  const stripe = colors && !todo.done ? urgencyOf(group) : undefined

  return (
    <li className="relative flex items-center border-b border-line/70 pr-4 last:border-0">
      {stripe && <span aria-hidden className={`absolute inset-y-0 left-0 w-12 ${stripe}`} />}
      <button
        type="button"
        aria-label={todo.done ? 'Als offen markieren' : 'Erledigt'}
        onClick={() => {
          toggleTodo(todo)
          if (points && level && !todo.done) toast(`+ ${pointsLabel(LEVEL_POINTS[level])}`)
        }}
        className="relative grid min-h-14 w-14 shrink-0 place-items-center"
      >
        {/* Auf der Farbfläche bekommt der Kreis eine helle Füllung, sonst verschwindet der Karamell-Rand */}
        <span className={`rounded-full ${stripe ? 'bg-surface' : ''}`}>
          <CheckCircle checked={todo.done} />
        </span>
      </button>
      <button type="button" onClick={onEdit} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 text-left">
        <span className={`min-w-0 flex-1 text-[15px] ${todo.done ? 'text-muted line-through' : 'font-medium'}`}>
          {catEmoji && <SymbolIcon value={catEmoji} size={15} className="mr-1.5 -mt-0.5 inline-block text-brand" />}
          {todo.title}
        </span>
        {todo.repeat && !todo.done && <RepeatIcon size={14} className="shrink-0 text-muted" aria-label={todo.due ? repeatLabel(todo.repeat, todo.due) : 'Wiederkehrend'} />}
        {label && (
          <span title={title} className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${overdue ? 'bg-warn-soft text-warn' : now ? 'bg-sand text-ink' : 'bg-bg text-muted'}`}>{label}</span>
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

/**
 * To-dos einer Zeitgruppe nach Kategorie bündeln: zuerst die ohne Kategorie (ohne Überschrift),
 * dann je Kategorie in der Reihenfolge der Kategorien. Innerhalb bleibt die Sortierung (Datum, Uhrzeit) erhalten.
 */
function byCategory(items: Todo[], cats: CategoryInfo[]) {
  const loose = items.filter((t) => !findCategory(cats, t.category))
  return [
    ...(loose.length ? [{ cat: undefined, items: loose }] : []),
    ...cats.map((cat) => ({ cat, items: items.filter((t) => t.category === cat.id) })).filter((b) => b.items.length > 0),
  ]
}

type Draft = Partial<Todo> & { title: string }

function TodoEditor({ todo, onClose }: { todo: Draft; onClose: () => void }) {
  const [title, setTitle] = useState(todo.title)
  const [due, setDue] = useState(todo.due)
  const [category, setCategory] = useState(todo.category)
  const [level, setLevel] = useState<Level | undefined>(todo.level)
  const [repeat, setRepeat] = useState<Repeat | undefined>(todo.repeat)
  // Fester Tag (Kalender) vs. Zeitraum: eigenes Datum und „Heute“ sind fest, die anderen Zeiträume nicht
  const [fixed, setFixed] = useState(() => (todo.id ? isFixed(todo) : !!todo.fixed))
  // Optionales Zeitfenster, nur bei festem Tag (z. B. Lerntag: 9:00–11:00 Kapitel 3)
  const [start, setStart] = useState(todo.start ?? '')
  const [end, setEnd] = useState(todo.end ?? '')
  const endInvalid = !!start && !!end && end <= start
  const points = usePointsSettings().enabled

  // Wiederholung braucht einen Tag – ohne Datum wird heute vorgeschlagen.
  const chooseRepeat = (r: Repeat | undefined) => {
    setRepeat(r)
    if (r && !due) setDue(today())
  }
  const changeDue = (d: string | undefined) => {
    setDue(d)
    if (!d) setRepeat(undefined)
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    // „#Masterprojekt“ im Titel legt die Kategorie bei Bedarf an
    const { title: clean, category: hashtag } = extractHashtag(title)
    if (!clean) return
    const cat = (hashtag && (await createCategory(hashtag))) || category
    const rep = due ? repeat : undefined
    // Ankertag nur neu setzen, wenn sich das Datum geändert hat (sonst wird der 31. nach dem April zum 30.)
    const repeatDay = rep && due ? (due === todo.due && todo.repeatDay ? todo.repeatDay : fromISO(due).getDate()) : undefined
    const timed = !!due && (fixed || !!rep) && !!start
    const times = { start: timed ? start : undefined, end: timed && end && !endInvalid ? end : undefined }
    const data = { title: clean, due, fixed: due ? fixed : undefined, ...times, category: cat, level: points ? level : todo.level, repeat: rep, repeatDay }
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
          <Chips
            value={fixed && horizonOf(due) !== 'heute' ? undefined : horizonOf(due)}
            options={HORIZONS}
            onChange={(id) => {
              changeDue(HORIZONS.find((h) => h.id === id)!.due())
              setFixed(id === 'heute')
            }}
          />
          <input type="date" aria-label="Eigenes Datum" value={due ?? ''} onChange={(e) => {
              changeDue(e.target.value || undefined)
              setFixed(!!e.target.value)
            }}
            className={inputClass}
          />
          <p className="text-xs text-muted">{due ? (fixed || repeat ? `${/^(Heute|Morgen|Gestern)$/.test(relativeDate(due)) ? relativeDate(due) : `Am ${relativeDate(due)}`} – steht im Kalender` : `Fällig bis ${relativeDate(due)}`) : 'Ohne Termin – oder eigenes Datum wählen'}</p>
        </div>

        {due && (fixed || repeat) && (
          <div className="space-y-2">
            <span className="flex items-center justify-between text-sm font-semibold">
              Uhrzeit <span className="font-normal text-muted">optional</span>
            </span>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="block px-1 text-xs text-muted">Von</span>
                <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
              </label>
              <label className="space-y-1">
                <span className="block px-1 text-xs text-muted">Bis</span>
                <input type="time" value={end} disabled={!start} onChange={(e) => setEnd(e.target.value)} className={`${inputClass} disabled:opacity-40`} />
              </label>
            </div>
            {endInvalid ? (
              <p className="text-xs text-warn">Das Ende liegt vor dem Beginn – es wird nicht gespeichert.</p>
            ) : (
              (start || end) && (
                <button
                  type="button"
                  onClick={() => {
                    setStart('')
                    setEnd('')
                  }}
                  className="h-8 px-1 text-xs text-muted"
                >
                  Ohne Uhrzeit
                </button>
              )
            )}
          </div>
        )}

        <div className="space-y-2">
          <span className="block text-sm font-semibold">Wiederholen</span>
          <Chips
            value={repeat ?? ''}
            options={[{ id: '', label: 'Nie' }, ...REPEATS]}
            onChange={(id) => chooseRepeat((id || undefined) as Repeat | undefined)}
          />
          <p className="text-xs text-muted">
            {repeat && due ? `${repeatLabel(repeat, due)} – nach dem Abhaken kommt das nächste To-do` : 'Tag oben wählen, dann den Rhythmus'}
          </p>
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
        {/* Versehentlich abgehakt? Dezent unter den Buttons wieder öffnen (entfernt auch ein offenes Folge-To-do) */}
        {todo.id && todo.done && (
          <button
            type="button"
            onClick={async () => {
              await toggleTodo(todo as Todo)
              onClose()
            }}
            className="mx-auto flex h-10 items-center gap-1.5 px-3 text-sm text-muted"
          >
            <RotateCcw size={14} /> Wieder öffnen
          </button>
        )}
      </form>
    </Sheet>
  )
}
