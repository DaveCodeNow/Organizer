import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Pencil, Plus, X } from 'lucide-react'
import { db, uid, type Goal, type SubGoal } from '../../lib/db'
import { formatDate } from '../../lib/dates'
import { Button, CheckCircle, EmptyState, Field, IconButton, SectionTitle, Sheet, fieldClass, inputClass } from '../../components/ui'
import { toast } from '../../components/Toast'
import { TagList, TagPicker, hasTag } from './tags'

const EMOJIS = ['🎯', '🏡', '💰', '🏃', '📚', '🎓', '🎵', '✈️', '🌱', '🧘', '🛠️', '❤️', '🎨', '🚗']

type Draft = { id?: number; title: string; emoji: string; note: string; targetDate: string; subgoals: SubGoal[]; done: boolean; tags: string[] }
const blank = (tag: string | null): Draft => ({ title: '', emoji: EMOJIS[0], note: '', targetDate: '', subgoals: [], done: false, tags: tag ? [tag] : [] })
const toDraft = (g: Goal): Draft => ({ ...g, note: g.note ?? '', targetDate: g.targetDate ?? '', tags: g.tags ?? [] })

const progress = (g: Pick<Goal, 'subgoals'>) => (g.subgoals.length ? g.subgoals.filter((s) => s.done).length / g.subgoals.length : 0)

export function Goals({ tag }: { tag: string | null }) {
  const all = useLiveQuery(() => db.goals.toArray(), [])
  const [editing, setEditing] = useState<Draft | null>(null)

  if (!all) return null
  const goals = all.filter((g) => hasTag(g, tag))

  const active = goals.filter((g) => !g.done).sort((a, b) => (a.targetDate ?? '9999').localeCompare(b.targetDate ?? '9999') || a.createdAt - b.createdAt)
  const reached = goals.filter((g) => g.done)

  return (
    <>
      <div className="space-y-5 px-5 pt-2">
        <Button variant="secondary" className="w-full" onClick={() => setEditing(blank(tag))}>
          <Plus size={18} /> {tag ? `Neues Ziel in #${tag}` : 'Neues Ziel'}
        </Button>

        {goals.length === 0 && tag && <p className="py-6 text-center text-sm text-muted">Noch keine Ziele in #{tag}.</p>}

        {goals.length === 0 && !tag && (
          <EmptyState emoji="🎯" title="Noch keine Ziele" text="Ziele sind das große Ganze, z. B. „Wohnung entrümpeln“ oder „Notgroschen aufbauen“. Zerlege sie in Unterziele und hake sie nach und nach ab." />
        )}

        {active.map((g) => (
          <GoalCard key={g.id} goal={g} hideTag={tag} onEdit={() => setEditing(toDraft(g))} />
        ))}

        {reached.length > 0 && (
          <section>
            <SectionTitle>Erreicht · {reached.length}</SectionTitle>
            <ul className="overflow-hidden rounded-3xl bg-surface/60">
              {reached.map((g) => (
                <li key={g.id} className="border-b border-line/70 last:border-0">
                  <button type="button" onClick={() => setEditing(toDraft(g))} className="flex min-h-14 w-full items-center gap-3 px-4 text-left">
                    <span className="text-xl">{g.emoji}</span>
                    <span className="flex-1 text-muted line-through">{g.title}</span>
                    <span className="text-sm">🏆</span>
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

function GoalCard({ goal, hideTag, onEdit }: { goal: Goal; hideTag: string | null; onEdit: () => void }) {
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
    toast(`🏆 Ziel „${goal.title}“ erreicht!`)
  }

  const meta = [
    goal.subgoals.length ? `${doneCount} von ${goal.subgoals.length} Unterzielen` : 'Keine Unterziele',
    goal.targetDate && `bis ${formatDate(goal.targetDate)}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <article className="rounded-3xl bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-bg text-2xl">{goal.emoji}</div>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="text-[17px] leading-snug font-semibold">{goal.title}</h3>
          <p className="text-sm text-muted">{meta}</p>
          <TagList tags={goal.tags} hide={hideTag} className="mt-1.5" />
        </div>
        <IconButton label={`${goal.title} bearbeiten`} tone="danger" onClick={onEdit}>
          <Pencil size={17} />
        </IconButton>
      </div>

      {goal.note && <p className="mt-3 text-sm whitespace-pre-line text-muted">{goal.note}</p>}

      {goal.subgoals.length > 0 && (
        <>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${p * 100}%` }} />
          </div>
          <ul className="mt-2 -mx-2">
            {goal.subgoals.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => toggle(s.id)} className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-2 text-left transition hover:bg-bg">
                  <CheckCircle checked={s.done} small />
                  <span className={`text-[15px] ${s.done ? 'text-muted line-through' : ''}`}>{s.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

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
            className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-ink transition active:scale-95 disabled:opacity-40"
          >
            <Plus size={20} />
          </button>
        </form>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setAdding(true)} className="flex h-10 items-center gap-1 rounded-full px-2 text-sm font-semibold text-brand">
            <Plus size={16} /> Unterziel
          </button>
          {(p === 1 || goal.subgoals.length === 0) && (
            // Als Aktion formuliert (Verb + Haken), damit es nicht wie ein Status „bereits erreicht“ wirkt.
            <Button variant={p === 1 ? 'primary' : 'secondary'} onClick={complete} className="ml-auto">
              <Check size={18} strokeWidth={2.5} /> Als erreicht markieren
            </Button>
          )}
        </div>
      )}
    </article>
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
      emoji: d.emoji,
      note: d.note.trim() || undefined,
      targetDate: d.targetDate || undefined,
      subgoals: d.subgoals.filter((s) => s.title.trim()),
      done: d.done,
      tags: d.tags.length ? d.tags : undefined,
    }
    if (d.id) await db.goals.update(d.id, data)
    else await db.goals.add({ ...data, createdAt: Date.now() } as Goal)
    onClose()
  }

  const remove = async () => {
    if (d.id && confirm(`Ziel „${d.title}“ löschen?`)) {
      await db.goals.delete(d.id)
      onClose()
    }
  }

  return (
    <Sheet open onClose={onClose} title={d.id ? 'Ziel bearbeiten' : 'Neues Ziel'}>
      <form onSubmit={save} className="space-y-5 pt-1 pb-2">
        <Field label="Ziel">
          <input autoFocus={!d.id} value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="z. B. Keller entrümpeln" className={inputClass} />
        </Field>

        <div>
          <span className="mb-1.5 block text-sm font-semibold">Tags</span>
          <TagPicker value={d.tags} onChange={(tags) => set({ tags })} />
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-semibold">Symbol</span>
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => set({ emoji: em })}
                className={`grid size-10 place-items-center rounded-xl text-xl transition ${d.emoji === em ? 'bg-brand-soft ring-2 ring-brand' : 'bg-bg'}`}
              >
                {em}
              </button>
            ))}
          </div>
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
                  className="grid size-10 shrink-0 place-items-center rounded-full text-muted transition hover:bg-red-50 hover:text-red-600"
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
                className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-ink transition active:scale-95 disabled:opacity-40"
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
