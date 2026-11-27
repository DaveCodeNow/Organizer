import { useState, type FormEvent } from 'react'
import { db, type CostKind, type FixedCost, type Interval, type Notice, newId } from '../../lib/db'
import { Button, Field, Segmented, Sheet, fieldClass, inputClass } from '../../components/ui'
import { confirmDialog } from '../../components/Confirm'
import { CONTRACTS, INTERVALS, NOTICES, euro, isEnergy, parseAmount, perMonth, tariffCheck, tariffPerMonth } from './costs'

type Draft = {
  id?: string
  kind: CostKind
  name: string
  amount: string
  interval: Interval
  provider: string
  contractNumber: string
  meterNumber: string
  contractEnd: string
  notice: Notice | ''
  note: string
  basePrice: string
  unitPrice: string
  annualUsage: string
  coldRent: string
  utilities: string
}

const str = (n: number | undefined) => (n == null ? '' : String(n).replace('.', ','))

export function toDraft(kind: CostKind, c?: FixedCost): Draft {
  return {
    id: c?.id,
    kind,
    name: c?.name ?? '',
    amount: c ? str(c.amount) : '',
    interval: c?.interval ?? 'monat',
    provider: c?.provider ?? '',
    contractNumber: c?.contractNumber ?? '',
    meterNumber: c?.meterNumber ?? '',
    contractEnd: c?.contractEnd ?? '',
    notice: c?.notice ?? '',
    note: c?.note ?? '',
    basePrice: str(c?.basePrice),
    unitPrice: str(c?.unitPrice),
    annualUsage: str(c?.annualUsage),
    // Miete ohne Aufschlüsselung (z. B. aus „Weitere Fixkosten“ übernommen): Gesamtbetrag vorbelegen, Nebenkosten leer
    coldRent: str(c?.coldRent ?? (kind === 'miete' && c?.utilities == null ? c?.amount : undefined)),
    utilities: str(c?.utilities),
  }
}

/** Optionale Zahl: leer → undefined, ungültig → NaN */
const optNum = (s: string) => (s.trim() ? parseAmount(s) : undefined)
const okNum = (n: number | undefined) => n === undefined || (Number.isFinite(n) && n >= 0)

/** Eingabefeld mit Einheit rechts (€, ct/kWh, kWh). */
function UnitInput({ value, onChange, unit, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; unit: string; placeholder?: string; autoFocus?: boolean }) {
  return (
    <div className="relative">
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        placeholder={placeholder ?? '0,00'}
        className={`${inputClass} ${unit.length > 2 ? 'pr-20' : 'pr-10'}`}
      />
      <span className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-sm text-muted">{unit}</span>
    </div>
  )
}

/** Anlegen/Bearbeiten eines Fixkosten-Postens bzw. eines Miet-, Strom-, Gas- oder Internetvertrags. */
export function CostEditor({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const [d, setD] = useState(draft)
  const set = (patch: Partial<Draft>) => setD({ ...d, ...patch })

  const contract = CONTRACTS.find((c) => c.id === d.kind)
  const rent = d.kind === 'miete'
  const energy = isEnergy(d.kind)

  const coldRent = optNum(d.coldRent)
  const utilities = optNum(d.utilities)
  const basePrice = optNum(d.basePrice)
  const unitPrice = optNum(d.unitPrice)
  const annualUsage = optNum(d.annualUsage)

  // Miete: Gesamtbetrag ergibt sich aus Kaltmiete + Nebenkosten, immer monatlich
  const amount = rent ? (coldRent ?? NaN) + (utilities ?? 0) : parseAmount(d.amount)
  const interval: Interval = rent ? 'monat' : d.interval
  const amountOk = Number.isFinite(amount) && amount >= 0
  const extrasOk = [coldRent, utilities, basePrice, unitPrice, annualUsage].every(okNum)
  const name = contract ? contract.label : d.name.trim()
  const valid = amountOk && extrasOk && !!name

  const tariff = { basePrice, unitPrice, annualUsage }
  const check = energy && amountOk && extrasOk ? tariffCheck({ ...tariff, amount, interval } as FixedCost) : undefined
  const tariffMonthly = energy && extrasOk ? tariffPerMonth(tariff) : undefined

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    // Leere optionale Felder als undefined speichern – Dexie entfernt sie dann aus dem Datensatz.
    const opt = (s: string) => s.trim() || undefined
    const data = {
      kind: d.kind,
      name,
      amount,
      interval,
      provider: opt(d.provider),
      contractNumber: rent ? undefined : opt(d.contractNumber),
      meterNumber: energy ? opt(d.meterNumber) : undefined,
      contractEnd: opt(d.contractEnd),
      notice: d.notice || undefined,
      note: opt(d.note),
      basePrice: energy ? basePrice : undefined,
      unitPrice: energy ? unitPrice : undefined,
      annualUsage: energy ? annualUsage : undefined,
      coldRent: rent ? coldRent : undefined,
      utilities: rent ? utilities : undefined,
    }
    if (d.id) await db.fixedCosts.update(d.id, data)
    else await db.fixedCosts.add({ ...data, id: newId(), createdAt: Date.now() } as FixedCost)
    onClose()
  }

  const remove = async () => {
    if (d.id && await confirmDialog(`„${name}“ löschen?`)) {
      await db.fixedCosts.delete(d.id)
      onClose()
    }
  }

  const title = contract ? contract.title : d.id ? 'Fixkosten bearbeiten' : 'Neue Fixkosten'

  return (
    <Sheet open onClose={onClose} title={title}>
      <form onSubmit={save} className="space-y-5 pt-1 pb-2">
        {!contract && (
          <Field label="Bezeichnung">
            <input autoFocus={!d.id} value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="z. B. Handy, Haftpflicht, Streaming" className={inputClass} />
          </Field>
        )}

        {rent ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kaltmiete">
                <UnitInput autoFocus={!d.id} value={d.coldRent} onChange={(coldRent) => set({ coldRent })} unit="€" />
              </Field>
              <Field label="Nebenkosten">
                <UnitInput value={d.utilities} onChange={(utilities) => set({ utilities })} unit="€" />
              </Field>
            </div>
            <p className="text-sm text-muted">
              {amountOk ? (
                <>
                  Gesamtmiete <span className="font-medium text-ink">{euro(amount)}</span> pro Monat
                </>
              ) : (
                'Beträge pro Monat. Nebenkosten inklusive Heizkosten-Vorauszahlung.'
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Field
              label={energy ? 'Abschlag' : 'Betrag'}
              hint={amountOk && d.interval !== 'monat' ? `≈ ${euro(perMonth({ amount, interval: d.interval }))} pro Monat` : undefined}
            >
              <UnitInput autoFocus={!!contract && !d.id} value={d.amount} onChange={(amount) => set({ amount })} unit="€" />
            </Field>
            <Segmented value={d.interval} options={INTERVALS} onChange={(interval) => set({ interval })} />
          </div>
        )}

        {energy && (
          <div className="space-y-3 rounded-3xl bg-bg p-4">
            <span className="block font-serif text-[17px] leading-[1.1] font-[600]">Tarif</span>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Arbeitspreis">
                <UnitInput value={d.unitPrice} onChange={(unitPrice) => set({ unitPrice })} unit="ct/kWh" placeholder="z. B. 32,5" />
              </Field>
              <Field label="Grundpreis">
                <UnitInput value={d.basePrice} onChange={(basePrice) => set({ basePrice })} unit="€/Mon." />
              </Field>
            </div>
            <Field label="Jahresverbrauch" hint="Steht auf der letzten Jahresabrechnung">
              <UnitInput value={d.annualUsage} onChange={(annualUsage) => set({ annualUsage })} unit="kWh" placeholder={d.kind === 'gas' ? 'z. B. 12.000' : 'z. B. 2.500'} />
            </Field>
            {check ? (
              <p className={`text-sm ${check.tone === 'warn' ? 'font-medium text-warn' : 'text-muted'}`}>{check.text}</p>
            ) : tariffMonthly != null ? (
              <p className="text-sm text-muted">Laut Tarif ≈ {euro(tariffMonthly)} pro Monat</p>
            ) : (
              <p className="text-sm text-muted">Mit Arbeitspreis und Verbrauch prüft die App, ob dein Abschlag passt.</p>
            )}
          </div>
        )}

        <Field label={rent ? 'Vermieter' : 'Anbieter'}>
          <input
            value={d.provider}
            onChange={(e) => set({ provider: e.target.value })}
            placeholder={rent ? 'optional, z. B. Hausverwaltung' : contract ? 'z. B. Stadtwerke' : 'optional'}
            className={inputClass}
          />
        </Field>

        {!rent && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vertragsnummer">
              <input value={d.contractNumber} onChange={(e) => set({ contractNumber: e.target.value })} placeholder="optional" className={inputClass} />
            </Field>
            {energy && (
              <Field label="Zählernummer">
                <input value={d.meterNumber} onChange={(e) => set({ meterNumber: e.target.value })} placeholder="optional" className={inputClass} />
              </Field>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Vertragsende" hint={rent ? 'Bei unbefristetem Vertrag leer lassen' : undefined}>
            <input type="date" value={d.contractEnd} onChange={(e) => set({ contractEnd: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Kündigungsfrist">
            <select value={d.notice} onChange={(e) => set({ notice: e.target.value as Notice | '' })} className={inputClass}>
              <option value="">Keine Angabe</option>
              {NOTICES.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Notiz">
          <textarea
            value={d.note}
            onChange={(e) => set({ note: e.target.value })}
            rows={3}
            placeholder={rent ? 'z. B. Kaution, Ansprechpartner, Mieterhöhungen' : 'z. B. Tarifname, Kundenportal, Ansprechpartner'}
            className={`${fieldClass} block w-full resize-none py-3`}
          />
        </Field>

        <div className="flex gap-2 pt-1">
          {d.id && (
            <Button variant="ghost" onClick={remove} className="text-warn">
              Löschen
            </Button>
          )}
          <Button type="submit" disabled={!valid} className="flex-1">
            Speichern
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
