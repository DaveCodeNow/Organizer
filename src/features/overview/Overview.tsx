import { useEffect, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertCircle, ChevronDown, ChevronRight, CircleCheck, Plus, ShoppingBasket, Target, type LucideIcon } from 'lucide-react'
import { db, type CostKind, type FixedCost } from '../../lib/db'
import { startOfWeek, today } from '../../lib/dates'
import { navigate } from '../../lib/nav'
import { PageHeader } from '../../components/ui'
import { CONTRACTS, INTERVALS, adoptRent, contractStatus, euro, perMonth, rentLine, tariffCheck, tariffLine } from './costs'
import { CostEditor, toDraft } from './CostEditor'
import { WeekCalendar } from './WeekCalendar'
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
  // Fixkosten-Karte (Verträge + weitere Posten) ist standardmäßig eingeklappt; der Zustand wird pro Gerät gemerkt.
  const [costsOpen, setCostsOpen] = useState(() => readFlag(COSTS_KEY))
  const toggleCosts = () => {
    setCostsOpen(!costsOpen)
    writeFlag(COSTS_KEY, !costsOpen)
  }
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
  // Verträge in fester Reihenfolge (Miete, Strom, Gas, Internet); fehlende als kleine „+“-Knöpfe
  const contracts = CONTRACTS.flatMap((k) => costs.filter((c) => c.kind === k.id).map((c) => ({ k, c })))
  const missing = CONTRACTS.filter((k) => !costs.some((c) => c.kind === k.id))
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
        {/* Kurzinfos aus den anderen Modulen */}
        <section className="grid grid-cols-3 gap-3">
          <Tile icon={ShoppingBasket} value={openItems} label="Artikel offen" onClick={() => navigate('list')} />
          <Tile icon={CircleCheck} value={dueTodos} label="To-dos fällig" warn={dueTodos > 0} onClick={() => navigate('goals')} />
          <Tile icon={Target} value={goals.length} label={goals.length ? `Ziele · ${goalProgress} %` : 'Ziele aktiv'} onClick={() => navigate('goals')} />
        </section>
        {weekPoints !== undefined && <WeekProgress points={weekPoints} goal={points.weeklyGoal} label="diese Woche" onClick={() => navigate('goals')} />}

        <WeekCalendar onEditCost={(c) => edit(c.kind, c)} />

        {/* Fixkosten: eine Karte – oben die Summe, aufgeklappt die Verträge und weiteren Posten, aus denen sie sich ergibt */}
        <section className="overflow-hidden rounded-3xl bg-surface">
          <button
            type="button"
            onClick={toggleCosts}
            aria-expanded={costsOpen}
            className="flex w-full items-end justify-between gap-3 px-5 py-4 text-left"
          >
            <span className="min-w-0">
              <span className="block text-sm text-muted">Fixkosten pro Monat</span>
              <span className="mt-0.5 block font-serif text-[26px] leading-[1.1]">{euro(total)}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2 pb-0.5">
              <span className="text-right text-xs text-muted">
                {costs.length === 0 ? 'Noch keine Posten' : <>{costs.length} Posten<br />{euro(total * 12)} im Jahr</>}
              </span>
              <ChevronDown size={20} className={`text-muted transition-transform ${costsOpen ? 'rotate-180' : ''}`} />
            </span>
          </button>

          {costsOpen && (
            <div className="border-t border-line/70 pb-2">
              <SubTitle>Verträge</SubTitle>
              <ul>
                {contracts.map(({ k, c }) => {
                  const lines = [tariffLine(c) && { text: tariffLine(c)!, tone: 'muted' as const }, tariffCheck(c), contractStatus(c)].filter((x) => !!x)
                  return (
                    <Row key={c.id} onClick={() => edit(k.id, c)}>
                      <span className="grid size-10 shrink-0 place-items-center self-start rounded-full bg-sand text-brand">
                        <k.icon size={19} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{c.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {c.kind === 'miete' ? rentLine(c) || c.provider || 'Vermieter nicht angegeben' : c.provider || 'Anbieter nicht angegeben'}
                        </span>
                        {lines.map((l) => (
                          <span key={l.text} className={`block text-xs ${l.tone === 'warn' ? 'font-medium text-warn' : 'text-muted'}`}>
                            {l.text}
                          </span>
                        ))}
                      </span>
                      <Amount cost={c} />
                    </Row>
                  )
                })}
              </ul>
              {missing.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pt-1 pb-2">
                  {missing.map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => edit(k.id)}
                      className="flex h-10 items-center gap-1.5 rounded-full border border-dashed border-line px-3.5 text-sm text-muted"
                    >
                      <Plus size={15} /> {k.title}
                    </button>
                  ))}
                </div>
              )}

              <SubTitle
                action={
                  <button type="button" onClick={() => edit('sonstig')} className="flex h-10 items-center gap-1 px-1 text-sm font-semibold text-brand">
                    <Plus size={16} /> Hinzufügen
                  </button>
                }
              >
                Weitere Fixkosten
              </SubTitle>
              {others.length === 0 ? (
                <p className="px-5 pb-2 text-sm text-muted">Versicherungen, Handy, Abos, Streaming … – hier eintragen, was jeden Monat (oder jedes Jahr) fällig ist.</p>
              ) : (
                <ul>
                  {others.map((c) => {
                    const status = contractStatus(c)
                    return (
                      <Row key={c.id} onClick={() => edit('sonstig', c)}>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{c.name}</span>
                          {(c.provider || status) && (
                            <span className={`block truncate text-xs ${status?.tone === 'warn' ? 'text-warn' : 'text-muted'}`}>
                              {[c.provider, status?.text].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </span>
                        <Amount cost={c} />
                      </Row>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </section>

        {/* Hinweise (Kündigungsfristen) – bleiben auch bei eingeklappter Karte sichtbar */}
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

      </div>

      {editing && <CostEditor draft={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

// Alter Schlüssel der früheren Verträge-Karte, damit der gemerkte Zustand erhalten bleibt
const COSTS_KEY = 'overview:contractsOpen'
function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}
function writeFlag(key: string, on: boolean) {
  try {
    localStorage.setItem(key, on ? '1' : '0')
  } catch {}
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
      <Icon size={20} className={warn ? 'text-warn' : 'text-brand'} />
      <span className={`mt-3 font-serif text-[28px] leading-[1.1] ${warn ? 'text-warn' : ''}`}>{value}</span>
      <span className="text-xs leading-tight text-muted">{label}</span>
    </button>
  )
}

/** Zwischenüberschrift innerhalb der Fixkosten-Karte */
function SubTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-3 px-5 pt-3">
      <h3 className="text-sm font-semibold text-muted">{children}</h3>
      {action}
    </div>
  )
}

function Row({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <li className="border-b border-line/70 last:border-0">
      <button type="button" onClick={onClick} className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-bg">
        {children}
      </button>
    </li>
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
