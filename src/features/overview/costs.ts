import { Flame, KeyRound, Wifi, Zap, type LucideIcon } from 'lucide-react'
import { db, type ContractKind, type FixedCost, type Interval, type Notice } from '../../lib/db'
import { daysUntil, formatDate, fromISO, toISO } from '../../lib/dates'

export const CONTRACTS: ReadonlyArray<{ id: ContractKind; label: string; title: string; icon: LucideIcon }> = [
  { id: 'miete', label: 'Miete', title: 'Mietvertrag', icon: KeyRound },
  { id: 'strom', label: 'Strom', title: 'Stromvertrag', icon: Zap },
  { id: 'gas', label: 'Gas', title: 'Gasvertrag', icon: Flame },
  { id: 'internet', label: 'Internet', title: 'Internetvertrag', icon: Wifi },
]

/** Strom und Gas haben Tarifangaben (Grundpreis, Arbeitspreis, Verbrauch) */
export const isEnergy = (kind: string) => kind === 'strom' || kind === 'gas'

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

const numFmt = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 })
export const num = (n: number) => numFmt.format(n)

type Tariff = Pick<FixedCost, 'basePrice' | 'unitPrice' | 'annualUsage'>

/** Kosten laut Tarif pro Monat: Grundpreis + Verbrauch × Arbeitspreis / 12 – nur wenn Arbeitspreis und Verbrauch bekannt sind. */
export function tariffPerMonth(c: Tariff) {
  if (c.unitPrice == null || c.annualUsage == null) return undefined
  return (c.basePrice ?? 0) + (c.annualUsage * c.unitPrice) / 100 / 12
}

/** „32,5 ct/kWh · Grundpreis 12,90 € · 2.500 kWh/Jahr“ – oder undefined ohne Angaben. */
export function tariffLine(c: Tariff) {
  const parts = [
    c.unitPrice != null && `${num(c.unitPrice)} ct/kWh`,
    c.basePrice != null && `Grundpreis ${euroShort(c.basePrice)}/Monat`,
    c.annualUsage != null && `${num(c.annualUsage)} kWh/Jahr`,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : undefined
}

/** Passt der Abschlag zum Tarif? Kleine Abweichungen (< 30 € im Jahr) gelten als passend. */
export function tariffCheck(c: FixedCost): Status | undefined {
  const t = tariffPerMonth(c)
  if (t == null) return undefined
  const diff = (perMonth(c) - t) * 12
  if (Math.abs(diff) < 30) return { text: `Abschlag passt zum Tarif (≈ ${euro(t)} pro Monat)`, tone: 'muted' }
  return diff < 0
    ? { text: `Abschlag ca. ${euro(-diff)} im Jahr zu niedrig – Nachzahlung möglich (Tarif ≈ ${euro(t)} pro Monat)`, tone: 'warn' }
    : { text: `Abschlag ca. ${euro(diff)} im Jahr höher als nötig (Tarif ≈ ${euro(t)} pro Monat)`, tone: 'muted' }
}

/** Euro ohne Cent bei glatten Beträgen: 780 → „780 €“, 12,9 → „12,90 €“ */
export const euroShort = (n: number) => (Number.isInteger(n) ? `${num(n)} €` : euro(n))

/** „780 € kalt + 170 € NK“ – kurz, damit es neben dem Betrag in eine Zeile passt; undefined ohne Aufschlüsselung. */
export function rentLine(c: Pick<FixedCost, 'coldRent' | 'utilities'>) {
  const parts = [c.coldRent != null && `${euroShort(c.coldRent)} kalt`, c.utilities != null && `${euroShort(c.utilities)} NK`].filter(Boolean)
  return parts.length ? parts.join(' + ') : undefined
}

/**
 * Gibt es noch keinen Mietvertrag, aber genau einen sonstigen Posten „Miete“ (auch Kalt-/Warmmiete), wird er
 * zum Mietvertrag. Idempotent – läuft bei jedem Laden der Übersicht, auch nachdem Daten per Sync ankommen.
 */
export async function adoptRent(costs: FixedCost[]) {
  if (costs.some((c) => c.kind === 'miete')) return
  const candidates = costs.filter((c) => c.kind === 'sonstig' && /^(kalt|warm|gesamt)?miete$/i.test(c.name.trim()))
  if (candidates.length !== 1) return
  await db.fixedCosts.update(candidates[0].id, { kind: 'miete', name: 'Miete' })
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
