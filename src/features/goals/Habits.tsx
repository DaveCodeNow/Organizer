import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Pencil, Plus } from 'lucide-react'
import { db, type Habit, type HabitFrequency, newId } from '../../lib/db'
import { addDays, startOfWeek, today, weekDays } from '../../lib/dates'
import { Button, Chips, EmptyState, Field, IconButton, SectionTitle, Segmented, Sheet, inputClass } from '../../components/ui'
import { confirmDialog } from '../../components/Confirm'
import { CategoryPicker, categoryLabel, findCategory, useCategories } from './categories'

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const FREQUENCIES = [
  { id: 'daily', label: 'Täglich' },
  { id: 'weekly', label: 'Wöchentlich' },
] as const satisfies ReadonlyArray<{ id: HabitFrequency; label: string }>
const PER_WEEK = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ id: String(n), label: `${n}×` }))

/** Tag abhaken bzw. Haken entfernen. */
function toggleDay(h: Habit, day: string) {
  const log = h.log.includes(day) ? h.log.filter((d) => d !== day) : [...h.log, day].sort()
  return db.habits.update(h.id, { log })
}

/** Tage in Folge – zählt ab heute, oder ab gestern, solange heute noch offen ist. */
function dailyStreak(log: Set<string>) {
  let d = today()
  if (!log.has(d)) d = addDays(d, -1)
  let n = 0
  while (log.has(d)) {
    n++
    d = addDays(d, -1)
  }
  return n
}

/** Wochen in Folge mit erreichtem Wochenziel – die laufende Woche zählt erst, wenn sie erreicht ist. */
function weeklyStreak(log: string[], target: number) {
  const perWeek = new Map<string, number>()
  for (const d of log) perWeek.set(startOfWeek(d), (perWeek.get(startOfWeek(d)) ?? 0) + 1)
  let w = startOfWeek()
  if ((perWeek.get(w) ?? 0) < target) w = addDays(w, -7)
  let n = 0
  while ((perWeek.get(w) ?? 0) >= target) {
    n++
    w = addDays(w, -7)
  }
  return n
}

type Draft = { id?: string; title: string; frequency: HabitFrequency; perWeek: number; category?: string }

export function Habits({ category }: { category: string | null }) {
  const all = useLiveQuery(() => db.habits.toArray(), [])
  const cats = useCategories()
  const [editing, setEditing] = useState<Draft | null>(null)

  if (!all) return null

  const current = findCategory(cats, category ?? undefined)
  const habits = all.filter((h) => !category || h.category === category).sort((a, b) => a.createdAt - b.createdAt)
  const groups = FREQUENCIES.map((f) => ({ ...f, items: habits.filter((h) => h.frequency === f.id) })).filter((g) => g.items.length > 0)
  const days = weekDays()

  return (
    <>
      <div className="space-y-6 px-5 pt-2">
        <Button variant="secondary" className="w-full" onClick={() => setEditing({ title: '', frequency: 'daily', perWeek: 3, category: current?.id })}>
          <Plus size={18} /> {current ? `Neuer Habit in ${categoryLabel(current)}` : 'Neuer Habit'}
        </Button>

        {habits.length === 0 &&
          (current ? (
            <p className="py-6 text-center text-sm text-muted">Noch keine Habits in {categoryLabel(current)}.</p>
          ) : (
            <EmptyState
              emoji="🔁"
              title="Noch keine Habits"
              text="Gewohnheiten, die du täglich oder ein paar Mal pro Woche machen willst – z. B. „Gitarre üben“ oder „Sport“. Hake sie in der Wochenleiste ab."
            />
          ))}

        {groups.map((g) => (
          <section key={g.id}>
            <SectionTitle>
              {g.label} <span className="font-normal">· {g.items.length}</span>
            </SectionTitle>
            <div className="space-y-3">
              {g.items.map((h) => (
                <HabitCard
                  key={h.id}
                  habit={h}
                  days={days}
                  showCategory={!current}
                  onEdit={() => setEditing({ id: h.id, title: h.title, frequency: h.frequency, perWeek: h.perWeek ?? 1, category: h.category })}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {editing && <HabitEditor draft={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function HabitCard({ habit, days, showCategory, onEdit }: { habit: Habit; days: string[]; showCategory: boolean; onEdit: () => void }) {
  const cats = useCategories()
  const emoji = showCategory ? findCategory(cats, habit.category)?.emoji : undefined
  const log = new Set(habit.log)
  const t = today()

  let status: string
  if (habit.frequency === 'daily') {
    const streak = dailyStreak(log)
    status = [streak ? `🔥 ${streak} ${streak === 1 ? 'Tag' : 'Tage'} in Folge` : 'Noch keine Serie', !log.has(t) && 'heute offen'].filter(Boolean).join(' · ')
  } else {
    const target = habit.perWeek ?? 1
    const count = days.filter((d) => log.has(d)).length
    const streak = weeklyStreak(habit.log, target)
    status = [count >= target ? `✓ ${count} von ${target} diese Woche` : `${count} von ${target} diese Woche`, streak && `🔥 ${streak} ${streak === 1 ? 'Woche' : 'Wochen'}`]
      .filter(Boolean)
      .join(' · ')
  }

  return (
    <article className="rounded-3xl bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 pt-1.5 pl-1">
          <h3 className="text-[17px] leading-snug font-semibold">
            {emoji && <span className="mr-1.5">{emoji}</span>}
            {habit.title}
          </h3>
          <p className="text-sm text-muted">{status}</p>
        </div>
        <IconButton label={`${habit.title} bearbeiten`} tone="danger" onClick={onEdit}>
          <Pencil size={17} />
        </IconButton>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const done = log.has(d)
          const isToday = d === t
          return (
            <button
              key={d}
              type="button"
              disabled={d > t}
              onClick={() => toggleDay(habit, d)}
              aria-pressed={done}
              aria-label={`${WEEKDAY_LABELS[i]}${isToday ? ' (heute)' : ''}: ${done ? 'erledigt' : 'offen'}`}
              className="flex flex-col items-center gap-1 rounded-2xl py-1 transition active:scale-95 disabled:opacity-35"
            >
              <span className={`text-[11px] font-semibold ${isToday ? 'text-brand' : 'text-muted'}`}>{WEEKDAY_LABELS[i]}</span>
              <span
                className={`grid size-9 place-items-center rounded-full border-2 transition ${
                  done ? 'border-brand bg-brand text-white animate-[pop_.25s_ease-out]' : isToday ? 'border-brand/60' : 'border-line'
                }`}
              >
                {done && <Check size={16} strokeWidth={3} />}
              </span>
            </button>
          )
        })}
      </div>
    </article>
  )
}

function HabitEditor({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const [d, setD] = useState(draft)
  const set = (patch: Partial<Draft>) => setD({ ...d, ...patch })

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!d.title.trim()) return
    const data = { title: d.title.trim(), frequency: d.frequency, perWeek: d.frequency === 'weekly' ? d.perWeek : undefined, category: d.category }
    if (d.id) await db.habits.update(d.id, data)
    else await db.habits.add({ ...data, id: newId(), log: [] as string[], createdAt: Date.now() } as Habit)
    onClose()
  }

  const remove = async () => {
    if (d.id && await confirmDialog(`Habit „${d.title}“ mit allen Haken löschen?`)) {
      await db.habits.delete(d.id)
      onClose()
    }
  }

  return (
    <Sheet open onClose={onClose} title={d.id ? 'Habit bearbeiten' : 'Neuer Habit'}>
      <form onSubmit={save} className="space-y-5 pt-1 pb-2">
        <Field label="Habit">
          <input autoFocus={!d.id} value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="z. B. 20 Min. Gitarre üben" className={inputClass} />
        </Field>

        <div className="space-y-2">
          <span className="block text-sm font-semibold">Wie oft?</span>
          <Segmented value={d.frequency} options={FREQUENCIES} onChange={(frequency) => set({ frequency })} />
          {d.frequency === 'weekly' && (
            <>
              <span className="block pt-1 text-xs text-muted">Mal pro Woche</span>
              <Chips value={String(d.perWeek)} options={PER_WEEK} onChange={(n) => set({ perWeek: Number(n) })} />
            </>
          )}
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-semibold">Kategorie</span>
          <CategoryPicker value={d.category} onChange={(category) => set({ category })} />
        </div>

        <div className="flex gap-2 pt-1">
          {d.id && (
            <Button variant="ghost" onClick={remove} className="text-red-600">
              Löschen
            </Button>
          )}
          <Button type="submit" disabled={!d.title.trim()} className="flex-1">
            Speichern
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
