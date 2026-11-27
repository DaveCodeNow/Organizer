import { endOfMonth, endOfWeek, endOfYear, today } from '../../lib/dates'

export type HorizonId = 'heute' | 'woche' | 'monat' | 'jahr' | 'ohne'

/** Zeithorizonte für To-dos. Gespeichert wird das daraus berechnete Fälligkeitsdatum. */
export const HORIZONS: ReadonlyArray<{ id: HorizonId; label: string; due: () => string | undefined }> = [
  { id: 'heute', label: 'Heute', due: today },
  { id: 'woche', label: 'Diese Woche', due: () => endOfWeek() },
  { id: 'monat', label: 'Diesen Monat', due: () => endOfMonth() },
  { id: 'jahr', label: 'Dieses Jahr', due: () => endOfYear() },
  { id: 'ohne', label: 'Ohne Termin', due: () => undefined },
]

/** Welcher Horizont passt genau zu diesem Datum? (undefined = eigenes Datum) */
export const horizonOf = (due: string | undefined) => HORIZONS.find((h) => h.due() === due)?.id

/** Gruppen für die To-do-Liste, in Anzeigereihenfolge. */
export const GROUPS = ['überfällig', 'heute', 'woche', 'monat', 'jahr', 'später', 'ohne'] as const
export type GroupId = (typeof GROUPS)[number]

export const GROUP_LABELS: Record<GroupId, string> = {
  überfällig: 'Überfällig',
  heute: 'Heute',
  woche: 'Diese Woche',
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
  if (due <= endOfMonth()) return 'monat'
  if (due <= endOfYear()) return 'jahr'
  return 'später'
}
