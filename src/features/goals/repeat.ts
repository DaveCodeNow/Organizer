import { db, newId, type Repeat, type Todo } from '../../lib/db'
import { addDays, fromISO, toISO, today } from '../../lib/dates'

/*
 * Wiederkehrende To-dos: Man wählt einen Tag (das Fälligkeitsdatum) und einen Rhythmus.
 * Beim Abhaken wird das nächste To-do mit dem folgenden Termin angelegt.
 */

/** `lead` = so viele Tage vor dem Termin erscheint das To-do in der Liste (vorher unter „Geplant“). */
export const REPEATS: ReadonlyArray<{ id: Repeat; label: string; months: number; lead: number }> = [
  { id: 'woche', label: 'Wöchentlich', months: 0, lead: Infinity },
  { id: 'monat', label: 'Monatlich', months: 1, lead: 7 },
  { id: 'quartal', label: 'Vierteljährlich', months: 3, lead: 14 },
  { id: 'halbjahr', label: 'Halbjährlich', months: 6, lead: 14 },
  { id: 'jahr', label: 'Jährlich', months: 12, lead: 28 },
]

/** Wiederkehrendes To-do, dessen Termin noch weit weg ist – wird erst kurz vorher in der Liste gezeigt. */
export function isPlanned(t: Todo, now = today()) {
  if (!t.repeat || !t.due || t.done) return false
  const lead = REPEATS.find((r) => r.id === t.repeat)!.lead
  return Number.isFinite(lead) && now < addDays(t.due, -lead)
}

/** Ab wann ein geplantes To-do in der Liste erscheint. */
export const visibleFrom = (t: Todo) => addDays(t.due!, -REPEATS.find((r) => r.id === t.repeat)!.lead)

/** Monate addieren; der Tag bleibt `day`, in kürzeren Monaten der letzte des Monats (31. → 30. Apr. → 31. Mai). */
function addMonths(iso: string, months: number, day: number) {
  const d = fromISO(iso)
  const y = d.getFullYear()
  const m = d.getMonth() + months
  const last = new Date(y, m + 1, 0).getDate()
  return toISO(new Date(y, m, Math.min(day, last)))
}

/** Nächster Termin nach `due`, der in der Zukunft liegt (verpasste Termine werden übersprungen). */
export function nextDue(due: string, repeat: Repeat, day = fromISO(due).getDate()) {
  const months = REPEATS.find((r) => r.id === repeat)!.months
  const step = (iso: string) => (months ? addMonths(iso, months, day) : addDays(iso, 7))
  let next = step(due)
  const t = today()
  while (next <= t) next = step(next)
  return next
}

/** „Jeden Montag“, „Jeden Monat am 3.“, „Alle 3 Monate am 3.“, „Jedes Jahr am 3. Dezember“ */
export function repeatLabel(repeat: Repeat, due: string) {
  const d = fromISO(due)
  switch (repeat) {
    case 'woche':
      return `Jeden ${d.toLocaleDateString('de-DE', { weekday: 'long' })}`
    case 'monat':
      return `Jeden Monat am ${d.getDate()}.`
    case 'quartal':
      return `Alle 3 Monate am ${d.getDate()}.`
    case 'halbjahr':
      return `Alle 6 Monate am ${d.getDate()}.`
    case 'jahr':
      return `Jedes Jahr am ${d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}`
  }
}

/** Abhaken bzw. wieder öffnen. Bei wiederkehrenden To-dos wird das nächste angelegt bzw. wieder entfernt. */
export async function toggleTodo(t: Todo) {
  if (t.done) {
    await db.transaction('rw', db.todos, async () => {
      // Das automatisch angelegte Folge-To-do wieder entfernen, solange es noch offen ist
      if (t.nextId) {
        const next = await db.todos.get(t.nextId)
        if (next && !next.done) await db.todos.delete(next.id)
      }
      await db.todos.update(t.id, { done: false, doneAt: undefined, nextId: undefined })
    })
    return
  }
  if (!t.repeat || !t.due) {
    await db.todos.update(t.id, { done: true, doneAt: Date.now() })
    return
  }
  const next: Todo = {
    id: newId(),
    title: t.title,
    due: nextDue(t.due, t.repeat, t.repeatDay),
    done: false,
    category: t.category,
    level: t.level,
    repeat: t.repeat,
    repeatDay: t.repeatDay,
    createdAt: Date.now(),
  }
  await db.transaction('rw', db.todos, async () => {
    await db.todos.add(next)
    await db.todos.update(t.id, { done: true, doneAt: Date.now(), nextId: next.id })
  })
}
