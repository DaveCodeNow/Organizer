import { useLiveQuery } from 'dexie-react-hooks'
import { db, type GoalCategory, type Level, type PointsSettings, type Todo } from '../../lib/db'
import { addDays, fromISO, startOfWeek, toISO } from '../../lib/dates'

/*
 * Punktesystem für To-dos (optional, Schalter im Menü von „Ziele & To-dos“).
 * Gespeichert wird je To-do nur die Stufe. Die Punktzahl kommt immer aus LEVEL_POINTS –
 * ändert man die Werte hier, gelten sie rückwirkend auch für alle vergangenen Wochen.
 */

export const LEVEL_POINTS: Record<Level, number> = { leicht: 1, mittel: 3, wichtig: 5 }

export const LEVELS: ReadonlyArray<{ id: Level; label: string; dots: number }> = [
  { id: 'leicht', label: 'Leicht', dots: 1 },
  { id: 'mittel', label: 'Mittel', dots: 2 },
  { id: 'wichtig', label: 'Wichtig', dots: 3 },
]

export const levelInfo = (l: Level) => LEVELS.find((x) => x.id === l)!
export const nextLevel = (l: Level): Level => LEVELS[(LEVELS.findIndex((x) => x.id === l) + 1) % LEVELS.length].id
/** Reihum: keine Punkte → Leicht → Mittel → Wichtig → keine Punkte */
export const cycleLevel = (l: Level | undefined): Level | undefined => (!l ? 'leicht' : l === 'wichtig' ? undefined : nextLevel(l))

/** Nicht jedes To-do braucht Punkte: ohne Stufe gibt es keine. */
export const pointsOf = (todo: Todo) => (todo.level ? LEVEL_POINTS[todo.level] : 0)

const DEFAULT: PointsSettings = { id: 'points', enabled: false }

export function usePointsSettings(): PointsSettings {
  return useLiveQuery(async () => (await db.settings.get('points')) ?? DEFAULT, [], DEFAULT)
}

export async function updatePointsSettings(patch: Partial<Omit<PointsSettings, 'id'>>) {
  const cur = (await db.settings.get('points')) ?? DEFAULT
  await db.settings.put({ ...cur, ...patch })
}

/** Montag (YYYY-MM-DD) der Woche, in der ein To-do mit Punkten erledigt wurde. */
export const weekOfDone = (todo: Todo) => (todo.done && todo.doneAt && todo.level ? startOfWeek(toISO(new Date(todo.doneAt))) : undefined)

export interface WeekStats {
  /** Montag der Woche */
  start: string
  total: number
  count: number
  /** Punkte je Kategorie-ID ('' = ohne Kategorie), absteigend sortiert */
  byCategory: Array<{ id: string; points: number; count: number }>
  /** Punkte je Wochentag, Mo–So */
  byDay: number[]
}

/** Punkte einer Woche aus den erledigten To-dos berechnen (inkl. archivierter). */
export function weekStats(todos: ReadonlyArray<Todo>, cats: ReadonlyArray<GoalCategory>, start: string): WeekStats {
  const byCat = new Map<string, { points: number; count: number }>()
  const byDay = Array(7).fill(0) as number[]
  let total = 0
  let count = 0
  for (const t of todos) {
    if (weekOfDone(t) !== start) continue
    const p = pointsOf(t)
    total += p
    count++
    const day = Math.round((fromISO(toISO(new Date(t.doneAt!))).getTime() - fromISO(start).getTime()) / 86_400_000)
    if (day >= 0 && day < 7) byDay[day] += p
    const key = t.category && cats.some((c) => c.id === t.category) ? t.category : ''
    const e = byCat.get(key) ?? { points: 0, count: 0 }
    e.points += p
    e.count++
    byCat.set(key, e)
  }
  const byCategory = [...byCat].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.points - a.points)
  return { start, total, count, byCategory, byDay }
}

/** Alle Wochen (Montage), in denen Punkte gesammelt wurden – neueste zuerst. */
export function weeksWithPoints(todos: ReadonlyArray<Todo>) {
  return [...new Set(todos.map(weekOfDone).filter((w): w is string => !!w))].sort().reverse()
}

/** „17.–23. Nov.“ bzw. „27. Okt. – 2. Nov.“ */
export function weekLabel(start: string) {
  const a = fromISO(start)
  const b = fromISO(addDays(start, 6))
  const month = (d: Date) => d.toLocaleDateString('de-DE', { month: 'short' })
  const year = b.getFullYear() !== new Date().getFullYear() ? ` ${b.getFullYear()}` : ''
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}.–${b.getDate()}. ${month(b)}${year}`
    : `${a.getDate()}. ${month(a)} – ${b.getDate()}. ${month(b)}${year}`
}

export const pointsLabel = (n: number) => `${n} ${n === 1 ? 'Punkt' : 'Punkte'}`
