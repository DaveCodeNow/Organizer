import { useLiveQuery } from 'dexie-react-hooks'
import { db, type FixedCost, type Goal, type Todo } from '../../lib/db'
import { addDays, fromISO, startOfWeek, toISO } from '../../lib/dates'
import { isFixed } from '../goals/horizons'
import { cancelDeadline } from './costs'

/*
 * Kalender der Übersicht: sammelt alles mit einem echten Tag aus den Modulen.
 * To-dos nur mit festem Tag (`isFixed`) – Zeiträume wie „Diese Woche“ würden sich sonst auf Sonntagen stapeln.
 */

export type CalEvent =
  | { kind: 'todo'; todo: Todo }
  | { kind: 'kuendigen'; cost: FixedCost }
  | { kind: 'ende'; cost: FixedCost }
  | { kind: 'ziel'; goal: Goal }

/** Reihenfolge im Tages-Sheet und bei den Punkten */
const ORDER: Record<CalEvent['kind'], number> = { kuendigen: 0, ende: 1, ziel: 2, todo: 3 }

/** Alle Termine, nach Tag (YYYY-MM-DD) gruppiert. */
export function useCalendar() {
  return useLiveQuery(async () => {
    const [todos, goals, costs] = await Promise.all([db.todos.toArray(), db.goals.toArray(), db.fixedCosts.toArray()])
    const map = new Map<string, CalEvent[]>()
    const add = (day: string, e: CalEvent) => map.set(day, [...(map.get(day) ?? []), e])

    for (const t of todos) if (!t.archived && t.due && isFixed(t)) add(t.due, { kind: 'todo', todo: t })
    for (const g of goals) if (!g.done && g.targetDate) add(g.targetDate, { kind: 'ziel', goal: g })
    for (const c of costs) {
      const deadline = cancelDeadline(c)
      if (deadline) add(deadline, { kind: 'kuendigen', cost: c })
      if (c.contractEnd) add(c.contractEnd, { kind: 'ende', cost: c })
    }
    for (const list of map.values()) list.sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || (a.kind === 'todo' && b.kind === 'todo' ? Number(a.todo.done) - Number(b.todo.done) : 0))
    return map
  }, [])
}

/** Punktfarbe je Art: Fristen in Terrakotta, Ziele in Salbei, To-dos in Karamell. Erledigte To-dos ohne Punkt. */
export function dotsOf(events: CalEvent[] | undefined) {
  const kinds = new Set<string>()
  for (const e of events ?? []) {
    if (e.kind === 'todo') !e.todo.done && kinds.add('bg-caramel')
    else if (e.kind === 'ziel') kinds.add('bg-brand')
    else kinds.add('bg-warn')
  }
  return [...kinds]
}

export const eventTitle = (e: CalEvent) =>
  e.kind === 'todo' ? e.todo.title : e.kind === 'ziel' ? e.goal.title : e.kind === 'kuendigen' ? `${e.cost.name} kündigen` : `${e.cost.name}: Vertragsende`

/** Die Tage eines Monatsrasters (Mo–So, inkl. Randtage der Nachbarmonate). `month` = beliebiger Tag im Monat. */
export function monthGrid(month: string) {
  const d = fromISO(month)
  const first = toISO(new Date(d.getFullYear(), d.getMonth(), 1))
  const last = toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0))
  const days: string[] = []
  for (let x = startOfWeek(first); x <= last || days.length % 7; x = addDays(x, 1)) days.push(x)
  return days
}

export const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
