import { useEffect, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertCircle, ChevronRight, CircleCheck, Plus, ShoppingBasket, Target, type LucideIcon } from 'lucide-react'
import { db, type CostKind, type FixedCost } from '../../lib/db'
import { startOfWeek, today } from '../../lib/dates'
import { navigate } from '../../lib/nav'
import { PageHeader, SectionTitle } from '../../components/ui'
import { CONTRACTS, INTERVALS, adoptRent, contractStatus, euro, perMonth, rentLine, tariffCheck, tariffLine } from './costs'
import { CostEditor, toDraft } from './CostEditor'
import { AccountButton } from '../account/AccountButton'
import { usePointsSettings, weekStats } from '../goals/points'
import { WeekProgress } from '../goals/PointsUI'

/** Haushaltsübersicht: Fixkosten, Verträge und das Wichtigste aus den anderen Modulen. */
export default function Overview() {
  const costs = useLiveQuery(() => db.fixedCosts.toArray(), [])
  const openItems = useLiveQuery(() => db.listItems.filter((i) => !i.checked).count(), [], 0)
  const todos = useLiveQuery(() => db.todos.filter((t) => !t.done).toArray(), [])
  const goals = useLiveQuery(() => db.goals.filter((g) => !g.done).toArray(), [])
  const [editing, setEditing] = useState<ReturnType<typeof toDraft> | null>(null)
  const points = usePointsSettings()
  const weekPoints = useLiveQuery(
    async () => (points.enabled ? weekStats(await db.todos.toArray(), await db.goalCategories.toArray(), startOfWeek()).total : undefined),
    [points.enabled],
  )

  // Einen bisher unter „Weitere Fixkosten“ erfassten Posten „Miete“ als Mietvertrag übernehmen
  useEffect(() => {
    if (costs) void adoptRent(costs)
  }, [costs])

  if (!costs || !todos || !goals) return null

  const edit = (kind: CostKind, c?: FixedCost) => setEditing(toDraft(kind, c))
  const total = costs.reduce((sum, c) => sum + perMonth(c), 0)
  const others = costs.filter((c) => c.kind === 'sonstig').sort((a, b) => perMonth(b) - perMonth(a))
  const alerts = costs.flatMap((c) => {
    const s = contractStatus(c)
    return s?.tone === 'warn' ? [{ cost: c, text: s.text }] : []
  })
  const t = today()
  const dueTodos = todos.filter((x) => x.due && x.due <= t).length
  const goalProgress = goals.length
    ? Math.round(
        (goals.reduce((sum, g) => sum + (g.subgoals.length ? g.subgoals.filter((s) => s.done).length / g.subgoals.length : 0), 0) / goals.length) * 100,
      )
    : 0

  const dateLabel = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <PageHeader eyebrow={<Brand />} title={<>Dein <em>Zuhause</em></>} subtitle={dateLabel} action={<AccountButton />} />

      <div className="space-y-6 px-5">
        {/* Fixkosten gesamt */}
        <section className="rounded-[2rem] bg-brand px-6 py-6 text-surface">
          <p className="text-sm font-medium text-surface/85">Fixkosten pro Monat</p>
          <p className="mt-2 font-serif text-[44px] leading-[1.1] font-normal tracking-tight">{euro(total)}</p>
          <p className="mt-2 text-sm text-surface/85">
            {costs.length === 0 ? 'Noch keine Posten erfasst' : `${costs.length} Posten · ${euro(total * 12)} im Jahr`}
          </p>
        </section>

        {/* Hinweise */}
        {alerts.length > 0 && (
          <section className="space-y-2">
            {alerts.map(({ cost, text }) => (
              <button
                key={cost.id}
                type="button"
                onClick={() => edit(cost.kind, cost)}
                className="flex w-full items-center gap-3 rounded-3xl bg-warn-soft px-4 py-3 text-left text-warn"
              >
                <AlertCircle size={20} className="shrink-0" />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold">{cost.name}</span> · {text}
                </span>
                <ChevronRight size={18} className="shrink-0" />
              </button>
            ))}
          </section>
        )}

        {/* Kurzinfos aus den anderen Modulen */}
        <section className="grid grid-cols-3 gap-3">
          <Tile icon={ShoppingBasket} value={openItems} label="Artikel offen" onClick={() => navigate('list')} />
          <Tile icon={CircleCheck} value={dueTodos} label="To-dos fällig" warn={dueTodos > 0} onClick={() => navigate('goals')} />
          <Tile icon={Target} value={goals.length} label={goals.length ? `Ziele · ${goalProgress} %` : 'Ziele aktiv'} onClick={() => navigate('goals')} />
        </section>
        {weekPoints !== undefined && <WeekProgress points={weekPoints} goal={points.weeklyGoal} label="diese Woche" onClick={() => navigate('goals')} />}

        {/* Verträge */}
        <section>
          <SectionTitle>Verträge</SectionTitle>
          <div className="space-y-3">
            {CONTRACTS.map((k) => {
              const c = costs.find((x) => x.kind === k.id)
              if (!c) {
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => edit(k.id)}
                    className="flex w-full items-center gap-3 rounded-3xl border border-dashed border-line p-4 text-left text-muted transition active:scale-[.99]"
                  >
                    <span className="grid size-11 place-items-center rounded-full bg-surface">
                      <k.icon size={20} />
                    </span>
                    <span className="flex-1 font-medium">{k.title} hinterlegen</span>
                    <Plus size={20} />
                  </button>
                )
              }
              const lines = [
                tariffLine(c) && { text: tariffLine(c)!, tone: 'muted' as const },
                tariffCheck(c),
                contractStatus(c),
              ].filter((x) => !!x)
              return (
                <CostCard key={k.id} icon={k.icon} cost={c} onClick={() => edit(k.id, c)}>
                  {lines.length > 0 && (
                    <div className="mt-3 space-y-1 border-t border-line/70 pt-3">
                      {lines.map((l) => (
                        <p key={l.text} className={`text-sm ${l.tone === 'warn' ? 'font-medium text-warn' : 'text-muted'}`}>
                          {l.text}
                        </p>
                      ))}
                    </div>
                  )}
                </CostCard>
              )
            })}
          </div>
        </section>

        {/* Weitere Fixkosten */}
        <section>
          <SectionTitle
            action={
              <button type="button" onClick={() => edit('sonstig')} className="flex h-10 items-center gap-1 px-1 text-sm font-semibold text-brand">
                <Plus size={16} /> Hinzufügen
              </button>
            }
          >
            Weitere Fixkosten
          </SectionTitle>
          {others.length === 0 ? (
            <button
              type="button"
              onClick={() => edit('sonstig')}
              className="w-full rounded-3xl border border-dashed border-line px-5 py-6 text-center text-sm text-muted"
            >
              Versicherungen, Handy, Abos, Streaming … – hier eintragen, was jeden Monat (oder jedes Jahr) fällig ist.
            </button>
          ) : (
            <ul className="overflow-hidden rounded-3xl bg-surface">
              {others.map((c) => {
                const status = contractStatus(c)
                return (
                  <li key={c.id} className="border-b border-line/70 last:border-0">
                    <button type="button" onClick={() => edit('sonstig', c)} className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{c.name}</span>
                        {(c.provider || status) && (
                          <span className={`block truncate text-xs ${status?.tone === 'warn' ? 'text-warn' : 'text-muted'}`}>
                            {[c.provider, status?.text].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </span>
                      <Amount cost={c} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {editing && <CostEditor draft={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

/** Logo und Name der App, dezent über dem Titel der Übersicht. */
function Brand() {
  return (
    <span className="flex items-center gap-1.5 text-sm font-medium text-muted">
      <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="-ml-1 size-7" />
      HomeMind
    </span>
  )
}

function Tile({ icon: Icon, value, label, warn, onClick }: { icon: LucideIcon; value: number; label: string; warn?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-start rounded-3xl bg-surface p-4 text-left transition active:scale-[.98]">
      <Icon size={20} className={warn ? 'text-warn' : 'text-muted'} />
      <span className={`mt-3 font-serif text-[28px] leading-[1.1] ${warn ? 'text-warn' : ''}`}>{value}</span>
      <span className="text-xs leading-tight text-muted">{label}</span>
    </button>
  )
}

function CostCard({ icon: Icon, cost, onClick, children }: { icon: LucideIcon; cost: FixedCost; onClick: () => void; children?: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="block w-full rounded-3xl bg-surface p-4 text-left transition active:scale-[.99]">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sand text-ink">
          <Icon size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{cost.name}</span>
          <span className="block truncate text-sm text-muted">
            {cost.kind === 'miete' ? rentLine(cost) || cost.provider || 'Vermieter nicht angegeben' : cost.provider || 'Anbieter nicht angegeben'}
          </span>
        </span>
        <Amount cost={cost} />
      </div>
      {children}
    </button>
  )
}

/** Betrag pro Monat, bei anderem Intervall zusätzlich der Originalbetrag. */
function Amount({ cost }: { cost: FixedCost }) {
  const interval = INTERVALS.find((i) => i.id === cost.interval)
  return (
    <span className="shrink-0 text-right">
      <span className="block font-semibold">{euro(perMonth(cost))}</span>
      <span className="block text-xs text-muted">{cost.interval === 'monat' ? 'pro Monat' : `${euro(cost.amount)} ${interval?.per}`}</span>
    </span>
  )
}
