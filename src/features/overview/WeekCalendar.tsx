import { useState, type FormEvent } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, FileText, Plus, Target } from 'lucide-react'
import { db, newId, type FixedCost, type Todo } from '../../lib/db'
import { addDays, formatDate, fromISO, startOfWeek, toISO, today } from '../../lib/dates'
import { navigate } from '../../lib/nav'
import { CheckCircle, Sheet, inputClass } from '../../components/ui'
import { toast } from '../../components/Toast'
import { toggleTodo } from '../goals/repeat'
import { timeLabel } from '../goals/horizons'
import { createCategory, extractHashtag } from '../goals/categories'
import { LEVEL_POINTS, pointsLabel, usePointsSettings } from '../goals/points'
import { WEEKDAY_LABELS, dotsOf, eventTitle, monthGrid, useCalendar, type CalEvent } from './calendar'

/** Wochenleiste der Übersicht (Mo–So, blätterbar); Antippen eines Tages öffnet das Tages-Sheet, der Titel den Monat. */
export function WeekCalendar({ onEditCost }: { onEditCost: (c: FixedCost) => void }) {
  const events = useCalendar()
  const [offset, setOffset] = useState(0)
  const [day, setDay] = useState<string | null>(null)
  const [month, setMonth] = useState<string | null>(null)
  const t = today()
  const start = addDays(startOfWeek(), offset * 7)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const label = offset === 0 ? 'Diese Woche' : offset === 1 ? 'Nächste Woche' : `${formatDate(days[0])} – ${formatDate(days[6])}`

  return (
    <section className="rounded-3xl bg-surface px-3 pt-2 pb-3">
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => setMonth(start)} className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full px-2 text-left">
          <CalendarDays size={18} className="shrink-0 text-brand" />
          <span className="truncate text-sm font-semibold">{label}</span>
        </button>
        <button type="button" aria-label="Vorige Woche" onClick={() => setOffset(offset - 1)} className="grid size-10 place-items-center rounded-full text-muted hover:bg-bg">
          <ChevronLeft size={18} />
        </button>
        <button type="button" aria-label="Nächste Woche" onClick={() => setOffset(offset + 1)} className="grid size-10 place-items-center rounded-full text-muted hover:bg-bg">
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="mt-1 grid grid-cols-7">
        {days.map((d, i) => (
          <DayCell key={d} day={d} weekday={WEEKDAY_LABELS[i]} isToday={d === t} events={events?.get(d)} onClick={() => setDay(d)} />
        ))}
      </div>

      {month && (
        <MonthSheet
          month={month}
          events={events}
          onMonth={setMonth}
          onDay={setDay}
          onClose={() => setMonth(null)}
        />
      )}
      {day && <DaySheet day={day} events={events?.get(day) ?? []} onEditCost={onEditCost} onClose={() => setDay(null)} />}
    </section>
  )
}

function DayCell({ day, weekday, isToday, events, muted, onClick }: { day: string; weekday?: string; isToday: boolean; events?: CalEvent[]; muted?: boolean; onClick: () => void }) {
  const dots = dotsOf(events)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${fromISO(day).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}${events?.length ? `, ${events.length} Einträge` : ''}`}
      className={`flex flex-col items-center gap-1 rounded-2xl py-1 transition active:scale-95 ${muted ? 'opacity-40' : ''}`}
    >
      {weekday && <span className={`text-[11px] font-semibold ${isToday ? 'text-brand' : 'text-muted'}`}>{weekday}</span>}
      <span className={`grid size-9 place-items-center rounded-full text-sm ${isToday ? 'bg-brand font-semibold text-surface' : ''}`}>{fromISO(day).getDate()}</span>
      <span className="flex h-1.5 gap-0.5">
        {dots.map((c) => (
          <span key={c} className={`size-1.5 rounded-full ${c}`} />
        ))}
      </span>
    </button>
  )
}

function MonthSheet({
  month,
  events,
  onMonth,
  onDay,
  onClose,
}: {
  month: string
  events: Map<string, CalEvent[]> | undefined
  onMonth: (m: string) => void
  onDay: (d: string) => void
  onClose: () => void
}) {
  const t = today()
  const m = fromISO(month)
  const shift = (n: number) => onMonth(toISO(new Date(m.getFullYear(), m.getMonth() + n, 1)))
  const title = m.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  return (
    <Sheet open onClose={onClose} title={title}>
      <div className="pb-3">
        <div className="mb-1 flex items-center justify-between">
          <button type="button" aria-label="Voriger Monat" onClick={() => shift(-1)} className="grid size-10 place-items-center rounded-full text-muted hover:bg-bg">
            <ChevronLeft size={20} />
          </button>
          <button type="button" onClick={() => onMonth(t)} className="h-10 px-3 text-sm font-semibold text-brand">
            Heute
          </button>
          <button type="button" aria-label="Nächster Monat" onClick={() => shift(1)} className="grid size-10 place-items-center rounded-full text-muted hover:bg-bg">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center">
          {WEEKDAY_LABELS.map((w) => (
            <span key={w} className="pb-1 text-[11px] font-semibold text-muted">
              {w}
            </span>
          ))}
          {monthGrid(month).map((d) => (
            <DayCell key={d} day={d} isToday={d === t} events={events?.get(d)} muted={fromISO(d).getMonth() !== m.getMonth()} onClick={() => onDay(d)} />
          ))}
        </div>
        <p className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted">
          <Legend color="bg-caramel" label="To-do" />
          <Legend color="bg-brand" label="Ziel" />
          <Legend color="bg-warn" label="Vertragsfrist" />
        </p>
      </div>
    </Sheet>
  )
}

const Legend = ({ color, label }: { color: string; label: string }) => (
  <span className="flex items-center gap-1.5">
    <span className={`size-1.5 rounded-full ${color}`} /> {label}
  </span>
)

function DaySheet({ day, events, onEditCost, onClose }: { day: string; events: CalEvent[]; onEditCost: (c: FixedCost) => void; onClose: () => void }) {
  const [text, setText] = useState('')
  const points = usePointsSettings().enabled
  const title = fromISO(day).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

  const add = async (e: FormEvent) => {
    e.preventDefault()
    // „#Kategorie“ im Titel wie im To-do-Editor
    const { title: clean, category: hashtag } = extractHashtag(text)
    if (!clean) return
    const category = hashtag ? await createCategory(hashtag) : undefined
    await db.todos.add({ id: newId(), title: clean, due: day, fixed: true, category, done: false, createdAt: Date.now() } as Todo)
    setText('')
  }

  const check = (todo: Todo) => {
    void toggleTodo(todo)
    if (points && todo.level && !todo.done) toast(`+ ${pointsLabel(LEVEL_POINTS[todo.level])}`)
  }

  return (
    <Sheet open onClose={onClose} title={title}>
      <div className="space-y-4 pb-2">
        {events.length === 0 ? (
          <p className="py-2 text-sm text-muted">Nichts eingetragen.</p>
        ) : (
          <ul className="overflow-hidden rounded-3xl bg-bg">
            {events.map((e) => (
              <li key={`${e.kind}-${e.kind === 'todo' ? e.todo.id : e.kind === 'ziel' ? e.goal.id : e.cost.id}`} className="border-b border-line/70 last:border-0">
                {e.kind === 'todo' ? (
                  <button type="button" onClick={() => check(e.todo)} className="flex min-h-12 w-full items-center gap-3 px-4 text-left">
                    <CheckCircle checked={e.todo.done} />
                    <span className={`min-w-0 flex-1 text-[15px] ${e.todo.done ? 'text-muted line-through' : 'font-medium'}`}>{e.todo.title}</span>
                    {timeLabel(e.todo) && <span className="shrink-0 text-xs text-muted tabular-nums">{timeLabel(e.todo)}</span>}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      if (e.kind === 'ziel') navigate('goals')
                      else onEditCost(e.cost)
                    }}
                    className="flex min-h-12 w-full items-center gap-3 px-4 text-left"
                  >
                    {e.kind === 'ziel' ? <Target size={20} className="shrink-0 text-brand" /> : <FileText size={20} className="shrink-0 text-warn" />}
                    <span className="min-w-0 flex-1 text-[15px] font-medium">{eventTitle(e)}</span>
                    <span className="shrink-0 text-xs text-muted">{e.kind === 'ziel' ? 'Ziel' : e.kind === 'kuendigen' ? 'Kündigungsfrist' : 'Vertrag'}</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={add} className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="To-do für diesen Tag" enterKeyHint="done" className={inputClass} />
          <button
            type="submit"
            aria-label="To-do hinzufügen"
            disabled={!text.trim()}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink transition active:scale-95 disabled:opacity-40"
          >
            <Plus size={20} />
          </button>
        </form>
      </div>
    </Sheet>
  )
}
