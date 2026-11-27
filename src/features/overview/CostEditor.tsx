import { useState, type FormEvent } from 'react'
import { db, type CostKind, type FixedCost, type Interval, type Notice } from '../../lib/db'
import { Button, Field, Segmented, Sheet, fieldClass, inputClass } from '../../components/ui'
import { confirmDialog } from '../../components/Confirm'
import { CONTRACTS, INTERVALS, NOTICES, euro, parseAmount, perMonth } from './costs'

type Draft = {
  id?: number
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
}

export function toDraft(kind: CostKind, c?: FixedCost): Draft {
  return {
    id: c?.id,
    kind,
    name: c?.name ?? '',
    amount: c ? String(c.amount).replace('.', ',') : '',
    interval: c?.interval ?? 'monat',
    provider: c?.provider ?? '',
    contractNumber: c?.contractNumber ?? '',
    meterNumber: c?.meterNumber ?? '',
    contractEnd: c?.contractEnd ?? '',
    notice: c?.notice ?? '',
    note: c?.note ?? '',
  }
}

/** Anlegen/Bearbeiten eines Fixkosten-Postens bzw. eines Strom-/Gas-/Internetvertrags. */
export function CostEditor({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const [d, setD] = useState(draft)
  const set = (patch: Partial<Draft>) => setD({ ...d, ...patch })

  const contract = CONTRACTS.find((c) => c.id === d.kind)
  const amount = parseAmount(d.amount)
  const amountOk = Number.isFinite(amount) && amount >= 0
  const name = contract ? contract.label : d.name.trim()
  const valid = amountOk && !!name

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    // Leere optionale Felder als undefined speichern – Dexie entfernt sie dann aus dem Datensatz.
    const opt = (s: string) => s.trim() || undefined
    const data = {
      kind: d.kind,
      name,
      amount,
      interval: d.interval,
      provider: opt(d.provider),
      contractNumber: opt(d.contractNumber),
      meterNumber: d.kind === 'strom' || d.kind === 'gas' ? opt(d.meterNumber) : undefined,
      contractEnd: opt(d.contractEnd),
      notice: d.notice || undefined,
      note: opt(d.note),
    }
    if (d.id) await db.fixedCosts.update(d.id, data)
    else await db.fixedCosts.add({ ...data, createdAt: Date.now() } as FixedCost)
    onClose()
  }

  const remove = async () => {
    if (d.id && await confirmDialog(`„${name}“ löschen?`)) {
      await db.fixedCosts.delete(d.id)
      onClose()
    }
  }

  const title = contract ? `${contract.emoji} ${contract.label}-Vertrag` : d.id ? 'Fixkosten bearbeiten' : 'Neue Fixkosten'

  return (
    <Sheet open onClose={onClose} title={title}>
      <form onSubmit={save} className="space-y-5 pt-1 pb-2">
        {!contract && (
          <Field label="Bezeichnung">
            <input autoFocus={!d.id} value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="z. B. Miete, Handy, Haftpflicht" className={inputClass} />
          </Field>
        )}

        <div className="space-y-2">
          <Field
            label={contract && contract.id !== 'internet' ? 'Abschlag' : 'Betrag'}
            hint={amountOk && d.interval !== 'monat' ? `≈ ${euro(perMonth({ amount, interval: d.interval }))} pro Monat` : undefined}
          >
            <div className="relative">
              <input
                autoFocus={!!contract && !d.id}
                value={d.amount}
                onChange={(e) => set({ amount: e.target.value })}
                inputMode="decimal"
                placeholder="0,00"
                className={`${inputClass} pr-10`}
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-muted">€</span>
            </div>
          </Field>
          <Segmented value={d.interval} options={INTERVALS} onChange={(interval) => set({ interval })} />
        </div>

        <Field label="Anbieter">
          <input value={d.provider} onChange={(e) => set({ provider: e.target.value })} placeholder={contract ? 'z. B. Stadtwerke' : 'optional'} className={inputClass} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Vertragsnummer">
            <input value={d.contractNumber} onChange={(e) => set({ contractNumber: e.target.value })} placeholder="optional" className={inputClass} />
          </Field>
          {(d.kind === 'strom' || d.kind === 'gas') && (
            <Field label="Zählernummer">
              <input value={d.meterNumber} onChange={(e) => set({ meterNumber: e.target.value })} placeholder="optional" className={inputClass} />
            </Field>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Vertragsende">
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
            placeholder="z. B. Tarifname, Kundenportal, Ansprechpartner"
            className={`${fieldClass} block w-full resize-none py-3`}
          />
        </Field>

        <div className="flex gap-2 pt-1">
          {d.id && (
            <Button variant="ghost" onClick={remove} className="text-red-600">
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
