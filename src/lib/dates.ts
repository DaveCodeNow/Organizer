/** Datumshilfen. Alle Daten als lokales YYYY-MM-DD (nicht toISOString – das wäre UTC und kann um einen Tag verrutschen). */

const pad = (n: number) => String(n).padStart(2, '0')

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function fromISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const today = () => toISO(new Date())

export function addDays(iso: string, n: number) {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** Montag der Woche, in der das Datum liegt. */
export function startOfWeek(iso = today()) {
  const d = fromISO(iso)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return toISO(d)
}

/** Die sieben Tage (Mo–So) der aktuellen Woche. */
export const weekDays = () => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(), i))

/** Sonntag der aktuellen Woche (Woche = Mo–So). */
export function endOfWeek(d = new Date()) {
  const x = new Date(d)
  x.setDate(x.getDate() + ((7 - x.getDay()) % 7))
  return toISO(x)
}

export const endOfMonth = (d = new Date()) => toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0))
export const endOfYear = (d = new Date()) => toISO(new Date(d.getFullYear(), 11, 31))

/** Tage von heute bis zum Datum (negativ = vergangen). */
export function daysUntil(iso: string) {
  return Math.round((fromISO(iso).getTime() - fromISO(today()).getTime()) / 86_400_000)
}

/** „4. Dez.“ bzw. „4. Dez. 2027“, wenn nicht im aktuellen Jahr. */
export function formatDate(iso: string) {
  const d = fromISO(iso)
  return d.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() !== new Date().getFullYear() && { year: 'numeric' }),
  })
}

/** „Heute“, „Morgen“, „Gestern“, „Fr“ (innerhalb einer Woche) oder Datum. */
export function relativeDate(iso: string) {
  const n = daysUntil(iso)
  if (n === 0) return 'Heute'
  if (n === 1) return 'Morgen'
  if (n === -1) return 'Gestern'
  if (n > 1 && n < 7) return fromISO(iso).toLocaleDateString('de-DE', { weekday: 'long' })
  return formatDate(iso)
}
