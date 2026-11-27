import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react'
import { db, type GoalCategory, type Level } from '../../lib/db'
import { addDays, startOfWeek } from '../../lib/dates'
import { Chips, IconButton, Sheet } from '../../components/ui'
import { SymbolIcon } from '../../components/icons'
import { LEVELS, LEVEL_POINTS, levelInfo, pointsLabel, usePointsSettings, weekLabel, weekStats, weeksWithPoints } from './points'

/** Ein bis drei Pünktchen für die Stufe (Leicht ●, Mittel ●●, Wichtig ●●●). */
export function LevelDots({ level, muted }: { level: Level; muted?: boolean }) {
  const n = levelInfo(level).dots
  return (
    <span className="flex items-center gap-[3px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className={`size-[7px] rounded-full ${i < n ? (muted ? 'bg-line' : 'bg-caramel') : 'border border-line'}`} />
      ))}
    </span>
  )
}

/** Stufenauswahl als Chips mit Pünktchen, inkl. „Keine“ (= keine Punkte). */
export function LevelPicker({ value, onChange }: { value: Level | undefined; onChange: (l: Level | undefined) => void }) {
  const options = [
    { id: '', label: 'Keine' },
    ...LEVELS.map((l) => ({ id: l.id, label: <><LevelDots level={l.id} /> {l.label}</> })),
  ]
  return <Chips value={value ?? ''} options={options} onChange={(id) => onChange((id || undefined) as Level | undefined)} />
}

/** Dezente Zeile mit dem Punktestand der laufenden Woche. */
export function WeekProgress({ points, goal, label, onClick }: { points: number; goal?: number; label: string; onClick: () => void }) {
  const reached = !!goal && points >= goal
  return (
    <button type="button" onClick={onClick} className="flex h-10 w-full items-center gap-2.5 text-left text-sm text-muted">
      <Sparkles size={15} className="shrink-0 text-caramel" aria-hidden />
      <span className="min-w-0 flex-1 truncate">
        <span className="font-semibold text-ink">{points}</span>
        {goal ? ` / ${goal}` : ''} {points === 1 && !goal ? 'Punkt' : 'Punkte'} {label}
      </span>
      {reached ? (
        <Check size={16} strokeWidth={2.5} className="shrink-0 text-brand" aria-label="Ziel erreicht" />
      ) : (
        !!goal && (
          <span className="h-1 w-14 shrink-0 overflow-hidden rounded-full bg-line" aria-hidden>
            <span className="block h-full rounded-full bg-caramel" style={{ width: `${Math.min(100, (points / goal) * 100)}%` }} />
          </span>
        )
      )}
      <ChevronRight size={16} className="shrink-0" aria-hidden />
    </button>
  )
}

const SEEN_KEY = 'points:reviewSeen'
const readSeen = () => {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

/** Karte „Deine Woche“: erscheint in der Folgewoche, bis man sie ausblendet (pro Gerät gemerkt). */
export function ReviewCard({ onOpen }: { onOpen: (week: string) => void }) {
  const settings = usePointsSettings()
  const last = addDays(startOfWeek(), -7)
  const [seen, setSeen] = useState(readSeen)
  const data = useLiveQuery(async () => {
    const [todos, cats] = await Promise.all([db.todos.toArray(), db.goalCategories.toArray()])
    return { stats: weekStats(todos, cats, last), cats }
  }, [last])
  if (!data || seen === last || data.stats.count === 0) return null

  const { stats, cats } = data
  const top = stats.byCategory.find((c) => c.id)
  const topName = top && cats.find((c) => c.id === top.id)?.name
  const goal = settings.weeklyGoal
  const dismiss = () => {
    try {
      localStorage.setItem(SEEN_KEY, last)
    } catch {}
    setSeen(last)
  }

  return (
    <div className="flex h-11 items-center gap-1 rounded-full bg-surface pr-0.5 pl-4 text-sm">
      <button type="button" onClick={() => onOpen(last)} className="flex h-full min-w-0 flex-1 items-center gap-2 text-left">
        <span className="min-w-0 flex-1 truncate text-muted">
          Rückblick {weekLabel(last)}: <span className="font-semibold text-ink">{pointsLabel(stats.total)}</span>
          {goal && stats.total >= goal ? ' · Ziel erreicht' : topName ? ` · vor allem ${topName}` : ''}
        </span>
        <ChevronRight size={16} className="shrink-0 text-muted" />
      </button>
      <button type="button" aria-label="Rückblick ausblenden" onClick={dismiss} className="grid size-10 shrink-0 place-items-center rounded-full text-muted transition hover:bg-bg">
        <X size={16} />
      </button>
    </div>
  )
}

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

/** Wochenrückblick mit Blättern durch die Wochen. */
export function ReportSheet({ week, onClose }: { week: string | null; onClose: () => void }) {
  return (
    <Sheet open={!!week} onClose={onClose} title="Wochenrückblick">
      {week && <Report initial={week} />}
    </Sheet>
  )
}

function Report({ initial }: { initial: string }) {
  const [week, setWeek] = useState(initial)
  const settings = usePointsSettings()
  const data = useLiveQuery(async () => {
    const [todos, cats] = await Promise.all([db.todos.toArray(), db.goalCategories.toArray()])
    return { todos, cats }
  }, [])
  const current = startOfWeek()
  const view = useMemo(() => {
    if (!data) return undefined
    const { todos, cats } = data
    const weeks = weeksWithPoints(todos)
    return {
      cats,
      stats: weekStats(todos, cats, week),
      prev: weekStats(todos, cats, addDays(week, -7)),
      first: weeks[weeks.length - 1] ?? current,
    }
  }, [data, week, current])
  if (!view) return null

  const { stats, prev, cats, first } = view
  const goal = settings.weeklyGoal
  const isCurrent = week === current
  const maxDay = Math.max(...stats.byDay)
  const bestDay = maxDay > 0 ? stats.byDay.indexOf(maxDay) : -1
  const delta = stats.total - prev.total

  const goalText = !goal
    ? undefined
    : stats.total >= goal
      ? `Wochenziel von ${goal} erreicht`
      : isCurrent
        ? `Noch ${goal - stats.total} bis zum Wochenziel von ${goal}`
        : `${goal - stats.total} unter dem Wochenziel von ${goal}`

  return (
    <div className="space-y-6 pt-1 pb-2">
      <div className="flex items-center justify-between gap-2">
        <IconButton label="Vorherige Woche" onClick={() => setWeek(addDays(week, -7))} disabled={week <= first}>
          <ChevronLeft size={20} />
        </IconButton>
        <span className="text-center text-sm font-semibold">{isCurrent ? 'Diese Woche' : weekLabel(week)}</span>
        <IconButton label="Nächste Woche" onClick={() => setWeek(addDays(week, 7))} disabled={week >= current}>
          <ChevronRight size={20} />
        </IconButton>
      </div>

      <div className="text-center">
        <p className="font-serif text-[52px] leading-[1.05]">{stats.total}</p>
        <p className="text-sm text-muted">{stats.total === 1 ? 'Punkt' : 'Punkte'} · {stats.count} {stats.count === 1 ? 'To-do' : 'To-dos'} erledigt</p>
        {goalText && <p className={`mt-2 text-sm font-semibold ${goal && stats.total >= goal ? 'text-brand' : 'text-ink'}`}>{goalText}</p>}
        {prev.total > 0 && (
          <p className="mt-1 text-sm text-muted">
            {delta === 0 ? 'Genauso viel wie in der Vorwoche' : `${Math.abs(delta)} ${delta > 0 ? 'mehr' : 'weniger'} als in der Vorwoche`}
          </p>
        )}
      </div>

      {stats.count === 0 ? (
        <p className="rounded-3xl bg-bg px-5 py-6 text-center text-sm text-muted">In dieser Woche wurden keine Punkte gesammelt.</p>
      ) : (
        <>
          <section>
            <h3 className="mb-3 font-serif text-[17px] font-[600]">Nach Tagen</h3>
            <div className="flex h-28 items-end gap-2">
              {stats.byDay.map((p, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  {p > 0 && <span className="text-xs text-muted">{p}</span>}
                  <span
                    className={`w-full max-w-5 rounded-full ${i === bestDay ? 'bg-brand' : p > 0 ? 'bg-caramel' : 'bg-line'}`}
                    style={{ height: p > 0 ? `${Math.max(8, (p / maxDay) * 72)}px` : '4px' }}
                  />
                  <span className={`text-xs ${i === bestDay ? 'font-semibold text-ink' : 'text-muted'}`}>{DAYS[i]}</span>
                </div>
              ))}
            </div>
            {bestDay >= 0 && <p className="mt-2 text-sm text-muted">Stärkster Tag: {DAY_NAMES[bestDay]}</p>}
          </section>

          <section>
            <h3 className="mb-3 font-serif text-[17px] font-[600]">Nach Kategorien</h3>
            <ul className="space-y-3.5">
              {withCategoryGoals(stats.byCategory, cats).map((c, i) => (
                <CategoryBar key={c.id || 'ohne'} entry={c} cat={cats.find((x) => x.id === c.id)} top={i === 0 && c.points > 0} max={Math.max(stats.byCategory[0]?.points ?? 0, 1)} />
              ))}
            </ul>
          </section>
        </>
      )}

      <p className="text-xs text-muted">
        Punkte pro Stufe: {LEVELS.map((l) => `${l.label} ${LEVEL_POINTS[l.id]}`).join(' · ')}. Gezählt wird die Woche, in der ein To-do erledigt wurde.
      </p>
    </div>
  )
}

type CatEntry = { id: string; points: number; count: number }

/** Kategorien mit Wochenziel auch dann zeigen, wenn sie in der Woche keine Punkte hatten. */
function withCategoryGoals(entries: CatEntry[], cats: GoalCategory[]): CatEntry[] {
  const missing = cats.filter((c) => c.weeklyGoal && !entries.some((e) => e.id === c.id)).map((c) => ({ id: c.id, points: 0, count: 0 }))
  return [...entries, ...missing]
}

function CategoryBar({ entry, cat, top, max }: { entry: CatEntry; cat?: GoalCategory; top: boolean; max: number }) {
  const goal = cat?.weeklyGoal
  const scale = Math.max(max, goal ?? 0)
  return (
    <li>
      <div className="mb-1.5 flex items-center gap-2 text-sm">
        {cat?.emoji && <SymbolIcon value={cat.emoji} size={15} className="shrink-0 text-muted" />}
        <span className={`min-w-0 flex-1 truncate ${top ? 'font-semibold' : ''}`}>{cat?.name ?? 'Ohne Kategorie'}</span>
        <span className="shrink-0 text-muted">
          {goal ? `${entry.points} / ${goal}` : entry.points}
          {goal && entry.points >= goal && <Check size={14} strokeWidth={2.5} className="-mt-0.5 ml-1 inline text-brand" aria-label="Ziel erreicht" />}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-line/70">
        <span className={`absolute inset-y-0 left-0 rounded-full ${top ? 'bg-brand' : 'bg-caramel'}`} style={{ width: `${(entry.points / scale) * 100}%` }} />
        {goal && <span className="absolute -inset-y-0.5 w-0.5 rounded-full bg-ink/60" style={{ left: `calc(${Math.min(100, (goal / scale) * 100)}% - 1px)` }} />}
      </div>
    </li>
  )
}

