import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, Pencil, Plus, Target, Trophy, X } from 'lucide-react'
import { db, uid, type Goal, type SubGoal, newId } from '../../lib/db'
import { formatDate } from '../../lib/dates'
import { Button, CheckCircle, EmptyState, Field, SectionTitle, Sheet, fieldClass, inputClass } from '../../components/ui'
import { confirmDialog } from '../../components/Confirm'
import { toast } from '../../components/Toast'
import { CategoryPicker, CategoryTag, categoryLabel, findCategory, useCategories } from './categories'

// Ziele haben kein eigenes Symbol – Symbole gehören zu den Kategorien (sichtbar in den Gruppen-Überschriften).
type Draft = { id?: string; title: string; category?: string; note: string; targetDate: string; subgoals: SubGoal[]; done: boolean }

const progress = (g: Pick<Goal, 'subgoals'>) => (g.subgoals.length ? g.subgoals.filter((s) => s.done).length / g.subgoals.length : 0)

export function Goals({ category }: { category: string | null }) {
  const all = useLiveQuery(() => db.goals.toArray(), [])
  const cats = useCategories()
  const [editing, setEditing] = useState<Draft | null>(null)

  if (!all) return null

  const current = findCategory(cats, category ?? undefined)
  const blank = (): Draft => ({
    title: '',
    category: current?.id,
    note: '',
    targetDate: '',
    subgoals: [],
    done: false,
  })
  const toDraft = (g: Goal): Draft => ({
    id: g.id,
    title: g.title,
    category: g.category,
    note: g.note ?? '',
    targetDate: g.targetDate ?? '',
    subgoals: g.subgoals,
    done: g.done,
  })

  const goals = all.filter((g) => !category || g.category === category)
  const active = goals.filter((g) => !g.done).sort((a, b) => (a.targetDate ?? '9999').localeCompare(b.targetDate ?? '9999') || a.createdAt - b.createdAt)
  const reached = goals.filter((g) => g.done)

  // Nach Kategorie gruppieren; Ziele ohne (oder mit gelöschter) Kategorie kommen ans Ende.
  const known = (g: Goal) => !!findCategory(cats, g.category)
  const groups = [
    ...cats.map((c) => ({ key: c.id, label: <CategoryTag cat={c} size={17} />, items: active.filter((g) => g.category === c.id) })),
    { key: 'ohne', label: 'Ohne Kategorie', items: active.filter((g) => !known(g)) },
  ].filter((g) => g.items.length > 0)
  // Überschriften nur, wenn sie etwas unterscheiden: nicht bei aktivem Filter und nicht, wenn es gar keine Kategorien gibt.
  const showHeadings = !category && cats.length > 0

  return (
    <>
      <div className="space-y-5 px-5 pt-2">
        <Button variant="secondary" className="w-full" onClick={() => setEditing(blank())}>
          <Plus size={18} /> {current ? `Neues Ziel in ${categoryLabel(current)}` : 'Neues Ziel'}
        </Button>

        {goals.length === 0 && current && <p className="py-6 text-center text-sm text-muted">Noch keine Ziele in {categoryLabel(current)}.</p>}

        {goals.length === 0 && !current && (
          <EmptyState
            icon={Target}
            title="Noch keine Ziele"
            text="Ziele sind das große Ganze, z. B. „Masterarbeit abgeben“ oder „Ein Album aufnehmen“. Zerlege sie in Unterziele und ordne sie Kategorien zu."
          />
        )}

        {groups.map((group) => (
          <section key={group.key}>
            {showHeadings && (
              <SectionTitle>
                {group.label}
                <span className="font-sans text-sm font-normal text-muted">{group.items.length}</span>
              </SectionTitle>
            )}
            <ul className="overflow-hidden rounded-3xl bg-surface">
              {group.items.map((g) => (
                <GoalRow key={g.id} goal={g} onEdit={() => setEditing(toDraft(g))} />
              ))}
            </ul>
          </section>
        ))}

        {reached.length > 0 && (
          <section>
            <SectionTitle>Erreicht · {reached.length}</SectionTitle>
            <ul className="overflow-hidden rounded-3xl bg-surface/60">
              {reached.map((g) => (
                <li key={g.id} className="flex items-center border-b border-line/70 pr-4 last:border-0">
                  <button
                    type="button"
                    aria-label={`${g.title} wieder öffnen`}
                    onClick={() => db.goals.update(g.id, { done: false })}
                    className="grid min-h-12 w-12 shrink-0 place-items-center"
                  >
                    <CheckCircle checked />
                  </button>
                  <button type="button" onClick={() => setEditing(toDraft(g))} className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="flex-1 text-[15px] text-muted line-through">{g.title}</span>
                    <Trophy size={17} className="text-caramel" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {editing && <GoalEditor draft={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

// Kompakte Zeile: Haken = Ziel erreicht, Antippen des Titels klappt Unterziele, Notiz und Aktionen auf.
function GoalRow({ goal, onEdit }: { goal: Goal; onEdit: () => void }) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const doneCount = goal.subgoals.filter((s) => s.done).length
  const p = progress(goal)

  const toggle = (id: string) => db.goals.update(goal.id, { subgoals: goal.subgoals.map((s) => (s.id === id ? { ...s, done: !s.done } : s)) })

  const addSub = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    await db.goals.update(goal.id, { subgoals: [...goal.subgoals, { id: uid(), title: text.trim(), done: false }] })
    setText('')
  }

  const complete = async () => {
    await db.goals.update(goal.id, { done: true })
    toast(`Ziel „${goal.title}“ erreicht`)
  }

  const meta = [goal.subgoals.length > 0 && `${doneCount}/${goal.subgoals.length}`, goal.targetDate && `bis ${formatDate(goal.targetDate)}`].filter(Boolean).join(' · ')

  return (
    <li className="border-b border-line/70 last:border-0">
      <div className="flex items-center pr-2">
        <button type="button" aria-label={`${goal.title} als erreicht markieren`} onClick={complete} className="grid min-h-12 w-12 shrink-0 place-items-center">
          <CheckCircle checked={false} />
        </button>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-12 min-w-0 flex-1 items-center gap-2 py-2 text-left">
          <span className="min-w-0 flex-1 text-[15px] font-medium">{goal.title}</span>
          {meta && <span className="shrink-0 text-xs text-muted">{meta}</span>}
          <ChevronDown size={16} className={`shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="pr-4 pb-3 pl-12">
          {goal.subgoals.length > 0 && (
            <>
              <span className="mb-1 block h-1 overflow-hidden rounded-full bg-line">
                <span className="block h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${p * 100}%` }} />
              </span>
              <ul className="-ml-2">
                {goal.subgoals.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => toggle(s.id)} className="flex min-h-10 w-full items-center gap-3 rounded-2xl px-2 text-left transition hover:bg-bg">
                      <CheckCircle checked={s.done} small />
                      <span className={`text-[15px] ${s.done ? 'text-muted line-through' : ''}`}>{s.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {goal.note && <p className="mt-1 text-sm whitespace-pre-line text-muted">{goal.note}</p>}

          {adding ? (
            <form onSubmit={addSub} className="mt-2 flex gap-2">
              <input
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={() => !text.trim() && setAdding(false)}
                placeholder="Unterziel"
                enterKeyHint="enter"
                className={inputClass}
              />
              <button
                type="submit"
                aria-label="Unterziel hinzufügen"
                disabled={!text.trim()}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink transition active:scale-95 disabled:opacity-40"
              >
                <Plus size={20} />
              </button>
            </form>
          ) : (
            <div className="mt-1 -ml-2 flex items-center gap-1">
              <button type="button" onClick={() => setAdding(true)} className="flex h-10 items-center gap-1 rounded-full px-2 text-sm font-semibold text-brand">
                <Plus size={16} /> Unterziel
              </button>
              <button type="button" onClick={onEdit} className="ml-auto flex h-10 items-center gap-1.5 rounded-full px-2 text-sm text-muted">
                <Pencil size={14} /> Bearbeiten
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

function GoalEditor({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const [d, setD] = useState(draft)
  const [sub, setSub] = useState('')
  const set = (patch: Partial<Draft>) => setD({ ...d, ...patch })

  const addSub = () => {
    if (!sub.trim()) return
    set({ subgoals: [...d.subgoals, { id: uid(), title: sub.trim(), done: false }] })
    setSub('')
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!d.title.trim()) return
    const data = {
      title: d.title.trim(),
      category: d.category,
      note: d.note.trim() || undefined,
      targetDate: d.targetDate || undefined,
      subgoals: d.subgoals.filter((s) => s.title.trim()),
      done: d.done,
    }
    if (d.id) await db.goals.update(d.id, data)
    else await db.goals.add({ ...data, id: newId(), createdAt: Date.now() } as Goal)
    onClose()
  }

  const remove = async () => {
    if (d.id && await confirmDialog(`Ziel „${d.title}“ löschen?`)) {
      await db.goals.delete(d.id)
      onClose()
    }
  }

  return (
    <Sheet open onClose={onClose} title={d.id ? 'Ziel bearbeiten' : 'Neues Ziel'}>
      <form onSubmit={save} className="space-y-5 pt-1 pb-2">
        <Field label="Ziel">
          <input autoFocus={!d.id} value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="z. B. Masterarbeit abgeben" className={inputClass} />
        </Field>

        <div>
          <span className="mb-1.5 block text-sm font-semibold">Kategorie</span>
          <CategoryPicker value={d.category} onChange={(category) => set({ category })} />
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-semibold">Unterziele</span>
          <div className="space-y-2">
            {d.subgoals.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={s.done ? 'Als offen markieren' : 'Erledigt'}
                  onClick={() => set({ subgoals: d.subgoals.map((x, j) => (j === i ? { ...x, done: !x.done } : x)) })}
                  className="grid size-10 shrink-0 place-items-center"
                >
                  <CheckCircle checked={s.done} small />
                </button>
                <input
                  value={s.title}
                  onChange={(e) => set({ subgoals: d.subgoals.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })}
                  aria-label="Unterziel"
                  className={`${inputClass} min-w-0 flex-1`}
                />
                <button
                  type="button"
                  aria-label={`${s.title} entfernen`}
                  onClick={() => set({ subgoals: d.subgoals.filter((_, j) => j !== i) })}
                  className="grid size-10 shrink-0 place-items-center rounded-full text-muted transition hover:bg-warn-soft hover:text-warn"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={sub}
                onChange={(e) => setSub(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addSub()
                  }
                }}
                placeholder="Unterziel hinzufügen"
                enterKeyHint="enter"
                className={inputClass}
              />
              <button
                type="button"
                aria-label="Unterziel hinzufügen"
                onClick={addSub}
                disabled={!sub.trim()}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink transition active:scale-95 disabled:opacity-40"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>

        <Field label="Bis wann? (optional)">
          <input type="date" value={d.targetDate} onChange={(e) => set({ targetDate: e.target.value })} className={inputClass} />
        </Field>

        <Field label="Notiz">
          <textarea
            value={d.note}
            onChange={(e) => set({ note: e.target.value })}
            rows={3}
            placeholder="Warum ist dir das wichtig? Was ist der erste Schritt?"
            className={`${fieldClass} block w-full resize-none py-3`}
          />
        </Field>

        {d.id && (
          <button
            type="button"
            onClick={() => set({ done: !d.done })}
            className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-bg px-4 text-left text-[15px] font-medium"
          >
            <CheckCircle checked={d.done} />
            Ziel erreicht
          </button>
        )}

        <div className="flex gap-2 pt-1">
          {d.id && (
            <Button variant="ghost" onClick={remove} className="text-warn">
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
