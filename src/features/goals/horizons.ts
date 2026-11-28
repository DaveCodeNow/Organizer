import { addDays, endOfMonth, endOfWeek, endOfYear, today } from '../../lib/dates'

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
 * Farbmodus der To-do-Liste: Streifenfarbe nach Dringlichkeit, abgeleitet aus der Gruppe (also nur aus dem Fälligkeitsdatum).
 * Ab „Diesen Monat“ bewusst ohne Farbe. Klassen ausgeschrieben lassen, damit Tailwind sie findet.
 */
const URGENCY: Partial<Record<GroupId, string>> = {
  überfällig: 'bg-urg-4',
  heute: 'bg-urg-3',
  woche: 'bg-urg-2',
  naechste: 'bg-urg-1',
}
export const urgencyOf = (group: GroupId | undefined) => (group ? URGENCY[group] : undefined)
