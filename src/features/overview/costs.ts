import type { ContractKind, FixedCost, Interval, Notice } from '../../lib/db'
import { daysUntil, formatDate, fromISO, toISO } from '../../lib/dates'

export const CONTRACTS: ReadonlyArray<{ id: ContractKind; label: string; emoji: string }> = [
  { id: 'strom', label: 'Strom', emoji: '⚡' },
  { id: 'gas', label: 'Gas', emoji: '🔥' },
  { id: 'internet', label: 'Internet', emoji: '📶' },
]

export const INTERVALS: ReadonlyArray<{ id: Interval; label: string; per: string; perMonth: number }> = [
  { id: 'monat', label: 'Monatlich', per: 'pro Monat', perMonth: 1 },
  { id: 'quartal', label: 'Quartal', per: 'pro Quartal', perMonth: 1 / 3 },
  { id: 'jahr', label: 'Jährlich', per: 'pro Jahr', perMonth: 1 / 12 },
]

export const NOTICES: ReadonlyArray<{ id: Notice; label: string }> = [
  { id: '2w', label: '2 Wochen' },
  { id: '4w', label: '4 Wochen' },
  { id: '1m', label: '1 Monat' },
  { id: '3m', label: '3 Monate' },
  { id: '6m', label: '6 Monate' },
]

/** Ab so vielen Tagen vor Ablauf der Kündigungsfrist wird gewarnt. */
const WARN_DAYS = 60

export const perMonth = (c: Pick<FixedCost, 'amount' | 'interval'>) => c.amount * (INTERVALS.find((i) => i.id === c.interval)?.perMonth ?? 1)

const euroFmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
export const euro = (n: number) => euroFmt.format(n)

/** „89,50“, „1.200“, „12 €“ → Zahl; ungültig → NaN */
export function parseAmount(s: string) {
  const clean = s.replace(/[\s€]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.')
  return clean === '' ? NaN : Number(clean)
}

/** Stichtag, bis zu dem gekündigt werden muss. */
export function cancelDeadline(c: Pick<FixedCost, 'contractEnd' | 'notice'>) {
  if (!c.contractEnd || !c.notice) return undefined
  const d = fromISO(c.contractEnd)
  const n = Number(c.notice.slice(0, -1))
  if (c.notice.endsWith('w')) d.setDate(d.getDate() - n * 7)
  else d.setMonth(d.getMonth() - n)
  return toISO(d)
}

export type Status = { text: string; tone: 'muted' | 'warn' }

/** Kurzer Statustext zur Vertragslaufzeit – oder undefined, wenn kein Vertragsende hinterlegt ist. */
export function contractStatus(c: FixedCost): Status | undefined {
  if (!c.contractEnd) return undefined
  const endIn = daysUntil(c.contractEnd)
  if (endIn < 0) return { text: `Vertragsende ${formatDate(c.contractEnd)} vorbei – Datum aktualisieren`, tone: 'warn' }

  const deadline = cancelDeadline(c)
  if (deadline) {
    const left = daysUntil(deadline)
    if (left >= 0 && left <= WARN_DAYS) {
      return { text: `Kündigen bis ${formatDate(deadline)} · ${left === 0 ? 'heute' : `noch ${left} ${left === 1 ? 'Tag' : 'Tage'}`}`, tone: 'warn' }
    }
    if (left < 0) return { text: `Läuft bis ${formatDate(c.contractEnd)} · Kündigungsfrist vorbei`, tone: 'muted' }
  }
  return { text: `Läuft bis ${formatDate(c.contractEnd)}`, tone: 'muted' }
}
