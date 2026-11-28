import { addDays, endOfMonth, endOfWeek, endOfYear, fromISO, today } from '../../lib/dates'
import type { Todo } from '../../lib/db'

/** Sonntag der nächsten Woche */
export const endOfNextWeek = () => addDays(endOfWeek(), 7)

export type HorizonId = 'heute' | 'woche' | 'naechste' | 'monat' | 'jahr' | 'ohne'

/**
 * Zeithorizonte für To-dos. Gespeichert wird das daraus berechnete Fälligkeitsdatum – „Nächste Woche“ ist also der
 * Sonntag der nächsten Woche und rutscht mit Wochenbeginn von selbst in „Diese Woche“ (die Gruppe wird immer neu berechnet).
 */
export const HORIZONS: ReadonlyArray<{ id: HorizonId; label: string; due: () => string | undefined }> = [
  { id: 'heute', label: 'Heute', due: today },
  { id: 'woche', label: 'Diese Woche', due: () => endOfWeek() },
  { id: 'naechste', label: 'Nächste Woche', due: endOfNextWeek },
  { id: 'monat', label: 'Diesen Monat', due: () => endOfMonth() },
  { id: 'jahr', label: 'Dieses Jahr', due: () => endOfYear() },
  { id: 'ohne', label: 'Ohne Termin', due: () => undefined },
]

/** Welcher Horizont passt genau zu diesem Datum? (undefined = eigenes Datum) */
export const horizonOf = (due: string | undefined) => HORIZONS.find((h) => h.due() === due)?.id

/** Gruppen für die To-do-Liste, in Anzeigereihenfolge. */
export const GROUPS = ['überfällig', 'heute', 'woche', 'naechste', 'monat', 'jahr', 'später', 'ohne'] as const
export type GroupId = (typeof GROUPS)[number]

export const GROUP_LABELS: Record<GroupId, string> = {
  überfällig: 'Überfällig',
  heute: 'Heute',
  woche: 'Diese Woche',
  naechste: 'Nächste Woche',
  monat: 'Diesen Monat',
  jahr: 'Dieses Jahr',
  später: 'Später',
  ohne: 'Ohne Termin',
}

export function groupOf(due: string | undefined): GroupId {
  if (!due) return 'ohne'
  const t = today()
  if (due < t) return 'überfällig'
  if (due === t) return 'heute'
  if (due <= endOfWeek()) return 'woche'
  if (due <= endOfNextWeek()) return 'naechste'
  if (due <= endOfMonth()) return 'monat'
  if (due <= endOfYear()) return 'jahr'
  return 'später'
}

/**
 * Farbmodus der To-do-Liste: Farbfläche nach Dringlichkeit (Token mit 45 % Deckkraft), abgeleitet aus der Gruppe (also nur aus dem Fälligkeitsdatum).
 * Ab „Diesen Monat“ bewusst ohne Farbe. Klassen ausgeschrieben lassen, damit Tailwind sie findet.
 */
const URGENCY: Partial<Record<GroupId, string>> = {
  überfällig: 'bg-urg-4/45',
  heute: 'bg-urg-3/45',
  woche: 'bg-urg-2/45',
  naechste: 'bg-urg-1/45',
}
export const urgencyOf = (group: GroupId | undefined) => (group ? URGENCY[group] : undefined)

/**
 * Hat das To-do einen festen Tag (Kalender) oder nur ein Zeitraum-Ende? Wiederkehrende immer fest.
 * Ältere To-dos ohne `fixed`: Zeiträume enden immer auf einem Sonntag oder Monatsletzten – alles andere war ein eigenes Datum.
 */
export function isFixed(t: Pick<Todo, 'due' | 'fixed' | 'repeat'>) {
  if (!t.due) return false
  if (t.repeat) return true
  if (t.fixed !== undefined) return t.fixed
  const d = fromISO(t.due)
  const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() === d.getDate()
  return d.getDay() !== 0 && !monthEnd
}

/** „9:00–11:30“ bzw. „ab 9:00“ – oder undefined ohne Uhrzeit. */
export function timeLabel(t: Pick<Todo, 'start' | 'end'>) {
  const f = (s: string) => s.replace(/^0(?=\d)/, '')
  if (!t.start) return undefined
  return t.end ? `${f(t.start)}–${f(t.end)}` : `ab ${f(t.start)}`
}

/** Läuft der Zeitraum gerade? (Nur sinnvoll für heute fällige To-dos) */
export function isNow(t: Pick<Todo, 'start' | 'end'>, now = new Date()) {
  if (!t.start || !t.end) return false
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return t.start <= hm && hm < t.end
}

/** Sortierung innerhalb eines Tages: mit Uhrzeit zuerst (chronologisch), dann ohne. */
export const byTime = (a: Pick<Todo, 'start'>, b: Pick<Todo, 'start'>) => (a.start ?? '99').localeCompare(b.start ?? '99')
